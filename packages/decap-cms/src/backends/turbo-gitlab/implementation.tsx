import API from '@/backends/gitlab/API';
import { GitLabBackend } from '@/backends/gitlab/index';
import { GitLabNotesAPI } from '@/backends/gitlab/notesApi';
import { NotesPollingManager } from '@/lib/backend/index';
import {
  attachEditorBridge,
  coalesceKey,
  createPreloadConfig,
  createRequestCoalescer,
  createScopedFetch,
  exposeProxyError,
  meterSave,
  peekBody,
  recordCmsEvent,
  recordProxyResponse,
  recordSaveEvent,
  resolveCommitAuthorFromSupabaseUser,
  savedBranch,
  sessionEndedResponse,
  SupabaseAuthenticationPage,
  SupabaseClient,
  TurboContentCache,
  TurboSession,
} from '@/lib/turbo/index';
import { stripIndent, unsentRequest } from '@/lib/util/index';

import type { BackendEntry, BackendFileRef, PersistPayload } from '@/lib/backend/index';
import type {
  EditorAttachArgs,
  EditorBridge,
  ProxyMeter,
  RequestCoalescer,
  ScopedFetch,
  SupabaseUser,
  TelemetryTarget,
} from '@/lib/turbo/index';
import type { ApiRequest, CmsBackendInitConfig, CmsCredentials, CmsPersistOptions, CmsUser } from '@/lib/util/index';

// The CMS user has no real GitLab identity; this mirrors the proxy's synthesized /gl/user.
type GitLabUser = {
  id: number,
  username: string,
  name: string,
  email?: string | undefined,
  avatar_url?: string | null | undefined,
  token?: string | undefined,
  access_token?: string | undefined,
  refresh_token?: string | undefined,
  expires_at?: number | undefined,
};

const PROXY_MARKER = '/functions/v1/gl';

export default class DecapTurboGitLabBackend extends GitLabBackend {
  static preloadConfig = createPreloadConfig('turbo-gitlab');

  supabaseAnonKey: string;
  supabaseId: string;
  siteId: string;
  commitAuthorEmailFallback?: string | undefined;
  reloadEntriesAfterPersist: boolean;
  session: TurboSession;
  supabase: SupabaseClient;
  cache: TurboContentCache;
  /** Turbo's own `_content/*` routes, which bypass GitLab's API client. */
  glFetch: ScopedFetch;
  _currentUserPromise?: Promise<GitLabUser> | undefined;
  /** Non-null only while a save is in flight; see `meterSave`. */
  proxyMeter: ProxyMeter | null = null;

  /** One per instance, so `apiRequestFunction` and `glFetch` join the same in-flight reads. */
  protected coalesceRequest: RequestCoalescer = createRequestCoalescer();

  /** The server's search covers entry bodies, so core need not filter them back out. */
  searchesEntryBody = true;

  editorBridgeEnabled = false;
  editorBridgeInstance: EditorBridge | null = null;

  constructor(config: CmsBackendInitConfig, options: Record<string, any> = {}) {
    super(config, options);

    // A GraphQL transport would bypass the per-site scoping in apiRequestFunction.
    if (this.useGraphQL) {
      throw new Error(
        "Decap Turbo GitLab backend does not support 'use_graphql: true': GraphQL requests would bypass per-site tenant scoping. Remove use_graphql from your config.",
      );
    }

    // GitLabBackend has no open authoring to fall back on, so without this the
    // option would be silently ignored rather than refused.
    if (config.backend.open_authoring) {
      throw new Error(
        "Decap Turbo GitLab backend does not support 'open_authoring: true': Turbo commits with the organization's GitLab connection, which cannot fork or commit to an editor's own project. Remove open_authoring from your config.",
      );
    }

    const backend = config.backend;
    this.supabaseAnonKey = backend.supabase_anon_key || backend.supabase_app_id || '';
    this.supabaseId = backend.supabase_app_id || '';
    this.siteId = backend.turbo_site_id || '';
    // Opt-in while in development: it uploads every editor's unsaved draft to
    // Turbo every few seconds, whether or not an agent is connected.
    this.editorBridgeEnabled = backend.editor_bridge === true;
    this.commitAuthorEmailFallback = backend.commit_author_email || backend.noreply_email;
    this.reloadEntriesAfterPersist = true;

    this.session = new TurboSession({
      supabaseId: this.supabaseId,
      anonKey: this.supabaseAnonKey,
      siteId: this.siteId,
      updateUserCredentials: options.updateUserCredentials,
      retrieveUserCredentials: options.retrieveUserCredentials,
      onSessionInvalid: options.onSessionInvalid,
      logout: () => this.logout(),
      onTokensChanged: accessToken => {
        this.supabase.setAccessToken(accessToken);
        this.token = accessToken;
        if (this.api) {
          this.api.token = accessToken ?? '';
        }
        this._currentUserPromise = undefined;
      },
    });

    this.supabase = new SupabaseClient(
      `https://${this.supabaseId}.supabase.co/rest/v1/data`,
      this.supabaseAnonKey,
      this.branch,
      this.repo,
      this.siteId,
    );

    this.glFetch = createScopedFetch({
      proxyMarker: PROXY_MARKER,
      session: this.session,
      getToken: () => this.session.accessToken || this.token || '',
      coalesce: this.coalesceRequest,
      getMeter: () => this.proxyMeter,
    });

    this.cache = new TurboContentCache({
      supabase: this.supabase,
      fetch: (url, init) => this.glFetch(url, init),
      apiRoot: this.apiRoot,
      getBranch: () => this.branch,
      host: 'GitLab',
    });
  }

  // Replaces GitLabBackend's PKCE apiRequestFunction: the only credential is a
  // Supabase JWT, and the `gl` proxy needs the x-site-id / site_id scoping.
  apiRequestFunction = async (req: ApiRequest): Promise<Response> => {
    const { session } = this;
    if (session.invalidMessage) return sessionEndedResponse(session.invalidMessage);
    try {
      await session.refreshIfNeeded();
    } catch (error) {
      // A refresh refused for good has just ended the session. Answered
      // rather than thrown, for the same reason as sessionEndedResponse.
      if (session.invalidMessage) return sessionEndedResponse(session.invalidMessage);
      throw error;
    }
    const accessToken = session.accessToken || this.token || '';
    const isGlProxyRequest = this.apiRoot.includes(PROXY_MARKER);

    let scopedReq = req as any;
    if (accessToken) {
      scopedReq = unsentRequest.withHeaders({ Authorization: `Bearer ${accessToken}` }, scopedReq);
    }
    if (this.siteId && isGlProxyRequest) {
      scopedReq = unsentRequest.withHeaders({ 'x-site-id': this.siteId }, scopedReq);
      scopedReq = unsentRequest.withParams({ site_id: this.siteId }, scopedReq);
    }

    // The one funnel that sees the final scoped request; the meter sits inside
    // the coalesced work so a joined duplicate is not counted.
    const response: Response = await this.coalesceRequest(
      coalesceKey(scopedReq.method, unsentRequest.toURL(scopedReq)),
      () =>
        unsentRequest.performRequest(scopedReq).then((res: Response) => {
          recordProxyResponse(this.proxyMeter, res);
          return res;
        }),
    );

    if (response.ok || !isGlProxyRequest) return response;
    const body = await peekBody(response);
    const verdict = await session.reactToProxyAuthAnswer(response.status, body, false);
    if (verdict !== 'retry') return exposeProxyError(response, body);

    // The request was built with the refused token; rebuild its header with
    // the one just refreshed. Not coalesced: it is this caller's.
    const retried = unsentRequest.withHeaders(
      { Authorization: `Bearer ${session.accessToken}` },
      scopedReq,
    );
    const second: Response = await unsentRequest.performRequest(retried);
    recordProxyResponse(this.proxyMeter, second);
    if (second.ok) return second;
    const secondBody = await peekBody(second);
    await session.reactToProxyAuthAnswer(second.status, secondBody, true);
    return exposeProxyError(second, secondBody);
  };

  async status() {
    return {
      auth: { status: await this.session.authStatus() },
      api: { status: true, statusPage: '' },
    };
  }

  /** GitLabBackend.logout knows nothing about the Turbo session or the bridge. */
  async logout() {
    this.session.clear();
    this.editorBridgeInstance?.stop();
    return super.logout();
  }

  // Widened to `any`: core hands the component to React unchanged, and the
  // base type describes GitLab's own wrapper, not a contract.
  authComponent(): any {
    return SupabaseAuthenticationPage;
  }

  restoreUser(user: CmsUser) {
    this.session.restore(user);
    return this.authenticate(user);
  }

  attachEditor(args: EditorAttachArgs) {
    attachEditorBridge(this, args, {
      enabled: this.editorBridgeEnabled,
      baseUrl: this.baseUrl,
      supabaseId: this.supabaseId,
      anonKey: this.supabaseAnonKey,
      siteId: this.siteId,
      getAccessToken: () => this.session.accessToken,
    });
  }

  async authenticate(state: CmsCredentials) {
    // Idempotent; ticks do nothing until the session has a token.
    this.editorBridgeInstance?.start();
    await this.session.begin(state);

    this.token = state.token as string;

    this.api = new API({
      token: this.token,
      branch: this.branch,
      repo: this.repo,
      apiRoot: this.apiRoot,
      squashMerges: this.squashMerges,
      cmsLabelPrefix: this.cmsLabelPrefix,
      initialWorkflowStatus: this.options.initialWorkflowStatus,
      graphQLAPIRoot: this.graphQLAPIRoot,
      requestFunction: this.apiRequestFunction,
    });

    // GitLabBackend.authenticate builds these, and this override replaces it.
    // Rebuilt, so a second login cannot leave the old manager polling.
    this.destroyNotesPolling();
    this.notesApi = new GitLabNotesAPI(this.api);
    this.pollingManager = new NotesPollingManager(this.notesApi.asPollingAPI(), 15000);

    // Unlike on GitHub, `hasWriteAccess` is a real question here: whether the
    // organization's group token can write to this project.
    const [user, turboPermissions] = await Promise.all([
      this.api.user(),
      this.session.fetchPermissions(this.baseUrl!),
    ]);

    const isCollab = await this.api.hasWriteAccess().catch((error: Error) => {
      error.message = stripIndent`
        Repo "${this.repo}" not found.

        Please ensure the repo information is spelled correctly.

        If your project is under a group, ensure the group's access token has been granted to this project.
      `;
      throw error;
    });

    if (!isCollab) {
      throw new Error(
        'The configured GitLab access token does not have write access to this project.',
      );
    }

    if (!this.isBranchConfigured) {
      const defaultBranch = await this.api.getDefaultBranch().catch(() => null);
      if (defaultBranch?.name) {
        this.branch = defaultBranch.name;
      }
    }

    const commitAuthor = resolveCommitAuthorFromSupabaseUser(state as SupabaseUser, this.commitAuthorEmailFallback);
    if (commitAuthor) {
      this.api.commitAuthor = commitAuthor;
    }

    recordCmsEvent(
      this.baseUrl!,
      this.supabaseAnonKey,
      this.session.accessToken,
      'cms_session_started',
      this.siteId,
    );

    const displayIdentity = this.session.sessionIdentity();

    return {
      ...user,
      login: user.username,
      // The proxy's synthesized /user falls back to "CMS Editor"; prefer what
      // the session knows about the person.
      ...(displayIdentity.name && { name: displayIdentity.name }),
      ...(displayIdentity.email && { email: displayIdentity.email }),
      avatar_url: displayIdentity.avatarUrl ?? user.avatar_url ?? null,
      ...this.session.storedUserFields(state, turboPermissions),
    };
  }

  async getToken(): Promise<string | null> {
    await this.session.refreshIfNeeded();
    return this.session.accessToken || this.token || null;
  }

  async currentUser(
    { token }: { token: string } = { token: this.token || '' },
  ): Promise<GitLabUser> {
    let promise = this._currentUserPromise;
    if (!promise) {
      promise = this._currentUserPromise = (async () => {
        await this.session.refreshIfNeeded();

        const owner = this.repo.split('/')[0];
        const identity = this.session.sessionIdentity();

        // `username` stays the project owner: other GitLab code paths treat it
        // as an identifier, not as a display name. `name`, `email` and the
        // avatar are the human-facing fields, and they name the person rather
        // than the group.
        return {
          id: 0,
          name: identity.name || owner,
          username: owner,
          email: identity.email,
          avatar_url: identity.avatarUrl,
          token,
          access_token: this.session.accessToken || undefined,
          refresh_token: this.session.refreshToken || undefined,
          expires_at: this.session.expiresAt || undefined,
        };
      })();
    }
    return promise;
  }

  /**
   * Overrides GitLabBackend's, which reads the username off `api.user()`: a
   * round trip to the proxy, answered from the local part of the editor's
   * email, so two editors at different domains who share one collide.
   */
  async noteAuthorIdentity(): Promise<{ author: string, authorId?: string | undefined }> {
    return this.session.noteAuthorIdentity();
  }

  async getEntry(path: string): Promise<BackendEntry> {
    return this.cache.getEntry(path, () => super.getEntry(path));
  }

  async entriesByFiles(files: BackendFileRef[]) {
    return this.cache.entriesByFiles(files);
  }

  async allEntriesByFolder(
    folder: string,
    extension: string,
    depth: number,
    pathRegex?: RegExp,
    searchTerm?: string,
    localeSiblingRegex?: RegExp,
  ) {
    return this.cache.allEntriesByFolder(
      folder,
      extension,
      depth,
      pathRegex,
      searchTerm,
      localeSiblingRegex,
    );
  }

  async entriesByFolder(folder: string, extension: string, depth: number) {
    return this.allEntriesByFolder(folder, extension, depth);
  }

  private telemetryTarget(): TelemetryTarget {
    return {
      baseUrl: this.baseUrl!,
      anonKey: this.supabaseAnonKey,
      accessToken: this.session.accessToken,
      siteId: this.siteId,
    };
  }

  async persistEntry(entry: PersistPayload, options: CmsPersistOptions) {
    const save = await meterSave(this, () => super.persistEntry(entry, options));
    const branch = savedBranch(save.result, options, entry, this.branch);
    recordSaveEvent(this.telemetryTarget(), entry, options, { ...save, branch });
    return save.result;
  }
}
