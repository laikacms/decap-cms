import { GitHubBackend } from '@/backends/github/index';
import { NotesPollingManager } from '@/lib/backend/index';
import {
  attachEditorBridge,
  coalesceKey,
  createPreloadConfig,
  createRequestCoalescer,
  createScopedFetch,
  meterSave,
  peekBody,
  recordCmsEvent,
  recordProxyResponse,
  recordSaveEvent,
  resolveCommitAuthorFromSupabaseUser,
  savedBranch,
  SupabaseAuthenticationPage,
  SupabaseClient,
  TurboContentCache,
  TurboSession,
} from '@/lib/turbo/index';
import { generateContentKey, unsentRequest } from '@/lib/util/index';
import TurboAPI from './API';

import type { GitHubUser } from '@/backends/github/index';
import type { BackendEntry, BackendFileRef, Note, PersistPayload } from '@/lib/backend/index';
import type {
  EditorAttachArgs,
  EditorBridge,
  ProxyMeter,
  RequestCoalescer,
  ScopedFetch,
  SupabaseUser,
  TelemetryTarget,
} from '@/lib/turbo/index';
import type { CmsConfig, CmsCredentials, CmsPersistOptions, CmsUser } from '@/lib/util/index';

const PROXY_MARKER = '/functions/v1/gh';

/**
 * GitHub through Decap Turbo: the Supabase session stands in for a GitHub
 * login, every request goes through Turbo's `gh` proxy scoped to the site,
 * listings and entry reads come from Turbo's content cache, and a save
 * commits through Turbo's `_content/commit` endpoint where it can.
 */
export default class DecapTurboGitHubBackend extends GitHubBackend {
  static preloadConfig = createPreloadConfig('turbo-github');

  supabaseAnonKey: string;
  supabaseId: string;
  siteId: string;
  commitAuthorEmailFallback?: string | undefined;
  reloadEntriesAfterPersist: boolean;
  session: TurboSession;
  supabase: SupabaseClient;
  cache: TurboContentCache;
  /** Every request to Turbo's own routes: session, x-site-id scoping, save meter. */
  ghFetch: ScopedFetch;
  /** Non-null only while a save is in flight; see `meterSave`. */
  proxyMeter: ProxyMeter | null = null;

  /** One per instance, so `requestFunction` and `ghFetch` join the same in-flight reads. */
  protected coalesceRequest: RequestCoalescer = createRequestCoalescer();

  /** The server's search covers entry bodies, so core need not filter them back out. */
  searchesEntryBody = true;

  editorBridgeEnabled = false;
  editorBridgeInstance: EditorBridge | null = null;

  constructor(config: CmsConfig, options: Record<string, any> = {}) {
    super(config, options);

    // GraphQLAPI's Apollo transport would bypass the per-site scoping below.
    if (this.useGraphql) {
      throw new Error(
        "Decap Turbo backend does not support 'use_graphql: true': GraphQL requests would bypass per-site tenant scoping. Remove use_graphql from your config.",
      );
    }

    // Every request goes out with the organization's GitHub App token, which
    // can neither fork a repo on an editor's behalf nor commit to one.
    if (this.openAuthoringEnabled) {
      throw new Error(
        "Decap Turbo backend does not support 'open_authoring: true': Turbo commits with the organization's GitHub App, which cannot fork or commit to an editor's own repository. Remove open_authoring from your config.",
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

    this.bypassWriteAccessCheckForAppTokens = true;
    this.tokenKeyword = 'Bearer';
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
        delete this._currentUserPromise;
      },
    });

    this.supabase = new SupabaseClient(
      `https://${this.supabaseId}.supabase.co/rest/v1/data`,
      this.supabaseAnonKey,
      this.branch,
      this.originRepo,
      this.siteId,
    );

    this.ghFetch = createScopedFetch({
      proxyMarker: PROXY_MARKER,
      session: this.session,
      getToken: () => this.session.accessToken || this.token || '',
      coalesce: this.coalesceRequest,
      getMeter: () => this.proxyMeter,
    });

    this.cache = new TurboContentCache({
      supabase: this.supabase,
      fetch: (url, init) => this.ghFetch(url, init),
      apiRoot: this.apiRoot,
      getBranch: () => this.branch,
      host: 'GitHub',
      speculativeRead: true,
    });
  }

  setScopedApiRequestBuilder() {
    if (!this.api) {
      return;
    }

    const isGhProxyApiRoot = this.apiRoot.includes(PROXY_MARKER);
    const api = this.api;

    const originalUrlFor = api.urlFor.bind(api);
    api.urlFor = (path, options) => {
      const builtUrl = originalUrlFor(path, options);
      if (!this.siteId || !isGhProxyApiRoot) {
        return builtUrl;
      }
      const urlObj = new URL(builtUrl);
      if (!urlObj.searchParams.has('site_id')) {
        urlObj.searchParams.set('site_id', this.siteId);
      }
      return urlObj.toString();
    };

    const originalRequestHeaders = api.requestHeaders.bind(api);
    api.requestHeaders = async (headers: Record<string, string> = {}) => {
      if (isGhProxyApiRoot) {
        this.session.assertUsable();
        await this.session.refreshIfNeeded();
        api.token = this.session.accessToken || this.token || '';
      }
      const builtHeaders = await originalRequestHeaders(headers);
      if (!this.siteId || !isGhProxyApiRoot) {
        return builtHeaders;
      }
      return { ...builtHeaders, 'x-site-id': this.siteId };
    };

    // lib/util's requestWithBackoff calls `api.requestFunction`, the only
    // funnel that sees every response and the final scoped URL, so the save
    // meter and the coalescer hang off it; the meter sits inside the
    // coalesced work so a joined duplicate is not counted. Cast because
    // GitHub's API class does not declare the hook.
    const perform = (req: unknown) => {
      // A plain request object in v4 (upstream's was an Immutable map).
      const request = req as { method?: string };
      return this.coalesceRequest(
        coalesceKey(request.method, unsentRequest.toURL(req as never)),
        () =>
          (unsentRequest.performRequest(req as never) as Promise<Response>).then(response => {
            recordProxyResponse(this.proxyMeter, response);
            return response;
          }),
      );
    };
    (api as unknown as { requestFunction?: (req: unknown) => Promise<Response> }).requestFunction = async req => {
      const response = await perform(req);
      if (response.ok || !isGhProxyApiRoot) return response;
      const body = await peekBody(response);
      const verdict = await this.session.reactToProxyAuthAnswer(response.status, body, false);
      if (verdict !== 'retry') return response;
      // The request was built with the refused token; rebuild its header
      // with the one just refreshed. Not coalesced: it is this caller's.
      const retried = unsentRequest.withHeaders(
        { Authorization: `${this.tokenKeyword} ${this.session.accessToken}` },
        req as never,
      );
      const second = (await unsentRequest.performRequest(retried as never)) as Response;
      recordProxyResponse(this.proxyMeter, second);
      if (!second.ok) {
        const secondBody = await peekBody(second);
        await this.session.reactToProxyAuthAnswer(second.status, secondBody, true);
      }
      return second;
    };

    // GitHub's handleRequestError reads `message`; a proxy refusal carries its
    // reason in `error`.
    const originalHandleRequestError = api.handleRequestError.bind(api);
    api.handleRequestError = (error, status) => {
      const withError = error as { message?: string, error?: unknown };
      return originalHandleRequestError(
        (!withError?.message && typeof withError?.error === 'string'
          ? { ...withError, message: withError.error }
          : error) as never,
        status,
      );
    };

    // Paginated reads never reach requestFunction, but every page passes
    // through here, so the session-ending answers are caught (not retried).
    const originalParseResponse = api.parseResponse.bind(api);
    api.parseResponse = (async (response: Response) => {
      if (!response.ok && isGhProxyApiRoot && (response.status === 403 || response.status === 409)) {
        await this.session.reactToProxyAuthAnswer(response.status, await peekBody(response), true);
      }
      return originalParseResponse(response);
    }) as typeof api.parseResponse;
  }

  async status() {
    const auth = await this.session.authStatus();
    const parentStatus = await super.status();

    return {
      auth: { status: auth },
      api: parentStatus.api,
    };
  }

  /** GitHubBackend.logout knows nothing about the Turbo session or the bridge. */
  logout() {
    this.session.clear();
    this.editorBridgeInstance?.stop();
    return super.logout();
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

  // Widened: core hands the component to React unchanged, and the base type
  // describes GitHub's own wrapper, not a contract.
  authComponent(): any {
    return SupabaseAuthenticationPage;
  }

  restoreUser(user: CmsUser) {
    this.session.restore(user);
    return this.authenticate(user);
  }

  async authenticate(state: CmsCredentials) {
    // Idempotent; ticks do nothing until the session has a token.
    this.editorBridgeInstance?.start();
    await this.session.begin(state);

    this.token = state.token as string;

    if (!this.isBranchConfigured) {
      const repoInfo = await this.ghFetch(`${this.apiRoot}/repos/${this.originRepo}`)
        .then(res => res.json())
        .catch(() => null);
      if (repoInfo && repoInfo.default_branch) {
        this.branch = repoInfo.default_branch;
      }
    }

    // TurboAPI commits through `_content/commit` in one request, and falls back
    // to the inherited REST sequence for what that endpoint does not cover.
    this.api = new TurboAPI({
      turboFetch: (url, init) => this.ghFetch(url, init),
      token: this.token,
      tokenKeyword: this.tokenKeyword,
      branch: this.branch,
      repo: this.repo,
      originRepo: this.originRepo,
      apiRoot: this.apiRoot,
      squashMerges: this.squashMerges,
      cmsLabelPrefix: this.cmsLabelPrefix,
      initialWorkflowStatus: this.options.initialWorkflowStatus,
      baseUrl: this.baseUrl,
      getUser: args => this.currentUser(args),
    });
    this.setScopedApiRequestBuilder();

    // GitHubBackend.authenticate builds this, and this override replaces it.
    // Rebuilt, so a second login cannot leave the old manager polling.
    this.pollingManager?.destroy();
    this.unwatchFunctions.clear();
    this.pollingManager = new NotesPollingManager(this.api, 15000);

    // No `api.hasWriteAccess()`: there is no GitHub user to ask about, and the
    // Turbo permissions read decides what this editor may touch.
    const [user, turboPermissions] = await Promise.all([
      this.api.user(),
      this.session.fetchPermissions(this.baseUrl!),
    ]);

    const commitAuthor = resolveCommitAuthorFromSupabaseUser(state as SupabaseUser, this.commitAuthorEmailFallback);
    if (commitAuthor) {
      this.api.commitAuthor = commitAuthor;
    }

    recordCmsEvent(this.baseUrl!, this.supabaseAnonKey, this.session.accessToken, 'cms_session_started', this.siteId);

    return {
      ...user,
      // API.user() drops the avatar the header renders.
      avatar_url: this.session.sessionIdentity().avatarUrl ?? undefined,
      // Rejected in the constructor, so never true here.
      useOpenAuthoring: false,
      ...this.session.storedUserFields(state, turboPermissions),
    };
  }

  async getToken(): Promise<string | null> {
    await this.session.refreshIfNeeded();
    return this.session.accessToken || this.token || null;
  }

  async currentUser({ token }: { token: string }): Promise<GitHubUser> {
    if (!this._currentUserPromise) {
      this._currentUserPromise = (async () => {
        await this.session.refreshIfNeeded();

        const owner = this.originRepo.split('/')[0];
        const identity = this.session.sessionIdentity();

        // `login` stays the repo owner: other GitHub code paths treat it as an
        // identifier (fork lookups, unpublished-entry authors), not as a
        // display name. `name`, `email` and the avatar are the human-facing
        // fields, and they name the person rather than the org.
        return {
          name: identity.name || owner,
          login: owner,
          email: identity.email,
          avatar_url: identity.avatarUrl,
          token,
          access_token: this.session.accessToken || undefined,
          refresh_token: this.session.refreshToken || undefined,
          expires_at: this.session.expiresAt || undefined,
        } as unknown as GitHubUser;
      })();
    }
    return this._currentUserPromise;
  }

  /**
   * Overrides GitHubBackend's, which reads `currentUser().login`: the repo
   * owner for every editor alike on this backend.
   */
  async noteAuthorIdentity(): Promise<{ author: string, authorId?: string | undefined }> {
    return this.session.noteAuthorIdentity();
  }

  /**
   * The thread only carries the App's avatar, so drop it here too and a new
   * note looks the same before and after a reload.
   */
  async addNote(collection: string, slug: string, noteData: Omit<Note, 'id'>, entryTitle?: string): Promise<Note> {
    const note = await super.addNote(collection, slug, noteData, entryTitle);
    return { ...note, avatarUrl: undefined };
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
    return this.cache.allEntriesByFolder(folder, extension, depth, pathRegex, searchTerm, localeSiblingRegex);
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
    const { result } = save;

    // The API client owns the content key format.
    const branch = savedBranch(
      result,
      options,
      entry,
      this.branch,
      (collection, slug) =>
        this.api ? this.api.generateContentKey(collection, slug) : generateContentKey(collection, slug),
    );
    recordSaveEvent(this.telemetryTarget(), entry, options, { ...save, branch });
    return result;
  }
}
