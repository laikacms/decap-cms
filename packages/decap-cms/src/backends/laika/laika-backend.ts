import * as Result from 'effect/Result';
import { AssetsJsonApiProxyRepository } from 'laikacms/assets/jsonapi-proxy';
import {
  errorCode,
  ErrorCodeToStatusMap,
  IllegalStateException,
  LaikaError,
  NotFoundError,
  TemplateLiteral as TL,
  Url,
} from 'laikacms/core';
import { DocumentsJsonApiProxyRepository } from 'laikacms/documents/jsonapi-proxy';
import { SyncToken } from 'laikacms/storage';
import React from 'react';

import { parsedContent, rawContent } from '@/lib/backend/index';
import { AccessTokenError, APIError, Cursor, CURSOR_COMPATIBILITY_SYMBOL, unsentRequest } from '@/lib/util/index';
import PKCEAuthenticationPage from './AuthenticationPage.js';
import DevAuthenticationPage from './DevAuthenticationPage.js';
import { requestQrTransferCode } from './qrLogin.js';

import type { BackendEntry, BackendEntryContent, UnpublishedEntry } from '@/lib/backend/index';
import type {
  CmsAssetProxy as AssetProxy,
  CmsConfig as Config,
  CmsCredentials as Credentials,
  CmsDataFile as DataFile,
  CmsDisplayURL as DisplayURL,
  CmsEntryLock,
  CmsEntryLockOwner,
  CmsFileEntry as Entry,
  CmsGetMediaPageOptions,
  CmsImplementation as Implementation,
  CmsImplementationFile as ImplementationFile,
  CmsImplementationMediaFile as ImplementationMediaFile,
  CmsMediaCapabilities,
  CmsMediaPage,
  CmsPersistOptions as PersistOptions,
  CmsUser as User,
  CursorCompatibleEntries,
} from '@/lib/util/index';
import type { Asset, AssetCreate, AssetsRepository, Resource } from 'laikacms/assets';
import type { ErrorCode, LaikaResult, LaikaStream, LaikaTask } from 'laikacms/core';
import type { Pagination } from 'laikacms/core';
import type { DocumentsRepository } from 'laikacms/documents';
import type { QrTransferCode } from './qrLogin.js';

/**
 * The default recoverable-warning handler: log to console.warn so devtools
 * surface partial-success states (e.g. an R2 readback fallback that
 * synthesized the resource + emitted a warning) that would otherwise vanish
 * silently at this user-facing edge.
 */
const defaultWarningHandler = (error: LaikaError): void => {
  console.warn(`Laika Backend: recoverable warning [${error.code}] ${error.message}`);
};

/**
 * Configuration for the Laika backend
 */
export interface LaikaBackendConfig {
  /** API URL for authentication and settings */
  apiUrl: string;
  /** Media folder path */
  mediaFolder: string;
  /** Allowed roles for access control */
  acceptRoles?: string[];
}

/**
 * The `backend:` block fields this backend reads. Core's `CmsBackend` covers
 * the git-backend vocabulary only, so the laika-specific fields are declared
 * here; every member is optional, which makes a `CmsBackend` assignable to
 * the intersection without a cast.
 */
interface LaikaBackendSettings {
  /** Accepted alias for `api_root`, for starter templates that predate it. */
  api_url?: string;
  auth_token_endpoint_content_type?: string;
  /** See {@link LaikaBackend.devToken}. */
  dev_token?: string;
}

/** Init options core passes to `Implementation.init` (see core/backend.tsx). */
interface LaikaBackendInitOptions {
  onSessionExpired?: () => void;
}

/** The access/refresh pair plus the access token's absolute expiry (epoch ms). */
interface TokenState {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Credentials as this backend exchanges them: core's `CmsCredentials` plus the
 * OAuth token-endpoint fields it round-trips through `restoreUser`.
 */
type LaikaCredentials = Credentials & {
  access_token?: string | undefined,
  /** Lifetime in seconds, as returned by a fresh token-endpoint response. */
  expires_in?: number | undefined,
  /** Absolute expiry in epoch ms, as stored by `persistTokenState`. */
  token_expires_at?: number | undefined,
};

/**
 * Options for getting a documents repository
 */
export interface GetDocumentsRepositoryOptions {
  tokenPromise: () => Promise<string>;
  /** Base URL for the API (apiUrl) */
  baseUrl: string;
}

/**
 * Options for getting an assets repository
 */
export interface GetAssetsRepositoryOptions {
  tokenPromise: () => Promise<string>;
  /** Base URL for the API (apiUrl) */
  baseUrl: string;
}

/**
 * Options for creating a Laika backend
 */
export interface CreateLaikaBackendOptions {
  /**
   * Factory function to create a DocumentsRepository.
   * Defaults to creating a DocumentsJsonApiProxyRepository.
   * The repository handles all collections - routing can be done internally if needed.
   */
  getDocumentsRepository?: (options: GetDocumentsRepositoryOptions) => DocumentsRepository;

  /**
   * Factory function to create an AssetsRepository for media/binary files.
   * Defaults to creating an AssetsJsonApiProxyRepository.
   */
  getAssetsRepository?: (options: GetAssetsRepositoryOptions) => AssetsRepository;

  /**
   * Base URL for the documents API (used by default factory)
   */
  documentsApiBaseUrl?: string;

  /**
   * Base URL for the assets API (used by default factory)
   */
  assetsApiBaseUrl?: string;

  /**
   * Optional handler invoked for every recoverable warning emitted by a
   * LaikaTask or LaikaStream the backend drains. Use this to route warnings
   * into your own observability (toasts, Sentry, metrics, structured logs).
   *
   * Defaults to a `console.warn` line, so partial-success states surface in
   * the Decap UI's devtools even if the host application doesn't wire its
   * own handler.
   */
  onWarning?: (error: LaikaError) => void;
}

/**
 * Creates a Laika CMS backend implementation with dependency injection
 * for storage and documents repositories.
 *
 * @param options - Configuration options including repository factories
 * @returns A class that implements the Decap CMS Implementation interface
 */
export default function createLaikaBackend(
  options: CreateLaikaBackendOptions = {},
): new(config: Config, opts?: Record<string, unknown>) => Implementation {
  const {
    getDocumentsRepository: customGetDocumentsRepository,
    getAssetsRepository: customGetAssetsRepository,
    documentsApiBaseUrl,
    assetsApiBaseUrl,
    onWarning,
  } = options;

  const handleRecoverableWarning = onWarning ?? defaultWarningHandler;

  /**
   * Drain a LaikaTask to its resolved value via the AsyncIterable interface
   * (no Effect dependency). Recoverable warnings emitted by the task are
   * routed to the configured `onWarning` handler (defaults to
   * {@link defaultWarningHandler}); progress events are dropped.
   */
  const firstResult = async <T>(task: LaikaTask.LaikaTask<T>): Promise<LaikaResult<T>> => {
    const it = task[Symbol.asyncIterator]();
    try {
      while (true) {
        const step = await it.next();
        if (step.done) return Result.succeed(step.value);
        for (const el of step.value) {
          if (el._tag === 'RecoverableError') handleRecoverableWarning(el.error);
        }
      }
    } catch (err) {
      if (err instanceof LaikaError) return Result.fail(err);
      throw err;
    }
  };

  /**
   * Drain a LaikaStream collecting all data items into a flat array.
   * Recoverable warnings are routed to the configured `onWarning` handler;
   * progress events are dropped.
   */
  const collectStream = async <A>(
    stream: LaikaStream.LaikaStream<A>,
  ): Promise<LaikaResult<ReadonlyArray<A>>> => {
    const data: A[] = [];
    try {
      for await (const chunk of stream) {
        for (const el of chunk) {
          if (el._tag === 'Data') data.push(el.value);
          else if (el._tag === 'RecoverableError') handleRecoverableWarning(el.error);
        }
      }
      return Result.succeed(data);
    } catch (err) {
      if (err instanceof LaikaError) return Result.fail(err);
      throw err;
    }
  };

  /**
   * Drain a LaikaStream collecting data items AND the stream's done value
   * (which `for await` discards). The done value carries continuation
   * pagination for cursor-paginated listings.
   */
  const collectStreamWithDone = async <A, D extends { total?: number, pagination?: Pagination }>(
    stream: LaikaStream.LaikaStream<A, D>,
  ): Promise<LaikaResult<{ data: ReadonlyArray<A>, done: D }>> => {
    const data: A[] = [];
    const it = stream[Symbol.asyncIterator]();
    try {
      while (true) {
        const step = await it.next();
        if (step.done) return Result.succeed({ data, done: step.value });
        for (const el of step.value) {
          if (el._tag === 'Data') data.push(el.value);
          else if (el._tag === 'RecoverableError') handleRecoverableWarning(el.error);
        }
      }
    } catch (err) {
      if (err instanceof LaikaError) return Result.fail(err);
      throw err;
    }
  };

  /**
   * The document content to persist for one of an entry's data files.
   *
   * `dataFile.path` is NOT a reliable format signal on every call: on create
   * it comes from selectEntryPath and carries the collection's extension
   * (e.g. "posts/slug.json"), but on update Decap's core takes it straight
   * from the entry it fetched back — and this backend's own getEntry/list
   * calls set that `path` to the storage-repo record key, which normalizeKey
   * stores WITHOUT an extension. So `/\.json$/.test(dataFile.path)` is true
   * on the create-time POST but false on the update-time PATCH for the exact
   * same JSON-format entry (DCMS-1062); `parseJsonEntryContent` sniffs the
   * payload shape when the extension check is inconclusive.
   *
   * The documents API rejects non-object content outright (DCMS-1254), and
   * markdown/YAML/TOML (frontmatter — Decap's default when no `format:` is
   * set) never parses into one. Surface that as an actionable client-side
   * error instead of letting the raw string reach the server, where it would
   * 400 with an opaque "content must be a plain object" the user cannot act on.
   */
  const toDocumentContent = (dataFile: DataFile, collectionName?: string): Record<string, unknown> => {
    const content = parseJsonEntryContent(dataFile.raw, /\.json$/i.test(dataFile.path));
    if (!isPlainRecord(content)) {
      throw new APIError(
        `Laika backend currently only supports JSON-format collections; `
          + `set \`format: json\` on collection \`${collectionName ?? dataFile.path.split('/')[0]}\`.`,
        400,
        'Laika Backend',
      );
    }
    return content;
  };

  /**
   * Every protocol failure reaches core as an APIError carrying the laika
   * error's status, prefixed with what the backend was trying to do.
   */
  const apiError = (context: string) => (error: LaikaError): APIError =>
    new APIError(`${context}: ${error.message}`, ErrorCodeToStatusMap[error.code], 'Laika Backend');

  /** Drain a task to its value, or throw `context: <protocol message>`. */
  const runTask = async <T>(task: LaikaTask.LaikaTask<T>, context: string): Promise<T> =>
    Result.getOrThrowWith(await firstResult(task), apiError(context));

  /** Drain a stream to its items, or throw `context: <protocol message>`. */
  const runStream = async <A>(
    stream: LaikaStream.LaikaStream<A>,
    context: string,
  ): Promise<ReadonlyArray<A>> => Result.getOrThrowWith(await collectStream(stream), apiError(context));

  /**
   * Default factory for DocumentsRepository using JSON:API proxy
   * Uses baseUrl/documents pattern (collection is passed via filter[folder])
   */
  const defaultGetDocumentsRepository = (opts: GetDocumentsRepositoryOptions): DocumentsRepository => {
    // Use explicit documentsApiBaseUrl if provided, otherwise derive from baseUrl
    const baseUrl = documentsApiBaseUrl || `${opts.baseUrl}/documents`;

    return new DocumentsJsonApiProxyRepository({
      baseUrl,
      tokenPromise: opts.tokenPromise,
    });
  };

  /**
   * Default factory for AssetsRepository using JSON:API proxy
   * Uses baseUrl/assets pattern
   */
  const defaultGetAssetsRepository = (opts: GetAssetsRepositoryOptions): AssetsRepository => {
    // Use explicit assetsApiBaseUrl if provided, otherwise derive from baseUrl
    const baseUrl = assetsApiBaseUrl || `${opts.baseUrl}/assets`;

    return new AssetsJsonApiProxyRepository({
      baseUrl,
      tokenPromise: opts.tokenPromise,
    });
  };

  const getDocumentsRepository = customGetDocumentsRepository || defaultGetDocumentsRepository;
  const getAssetsRepository = customGetAssetsRepository || defaultGetAssetsRepository;

  /**
   * Normalize a document key by removing file extensions
   * Decap CMS sends keys like "articles/test.json" but we store them as "articles/test"
   */
  const normalizeKey = (key: string): string => {
    // Remove common file extensions used by Decap CMS
    return key.replace(/\.(json|yaml|yml|md|markdown|toml)$/i, '');
  };

  /**
   * A record's content as it crosses the CMS seam. Documents are stored
   * structured, so they are handed over as `parsed` and reach the entry by
   * reference: no stringifying a document just so the engine can parse it
   * straight back, and no entry codec needed for JSON collections.
   *
   * Records whose content is text (markdown and friends, stored as a string)
   * stay `raw`, so the engine parses them with the collection's format as
   * before. Anything else - an array, a number - has no field shape, so it is
   * carried as its JSON text and left to the collection's format to reject.
   */
  const recordContent = (content: unknown): BackendEntryContent => {
    if (typeof content === 'string') {
      return rawContent(content);
    }
    if (isPlainRecord(content)) {
      return parsedContent(content);
    }
    return rawContent(JSON.stringify(content));
  };

  const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  /**
   * The inverse of `contentToRawString` for `persistEntry`: turns a data
   * file's raw serialized text back into the object shape the documents API
   * expects for JSON-format entries. `pathLooksJson` (a `.json`-extension
   * check on `dataFile.path`) is a reliable signal on the create path, but
   * NOT on update — see {@link toDocumentContent} for why. When the extension
   * check is inconclusive, fall back to sniffing the raw text itself: only
   * parse it as JSON if it actually looks like a JSON object/array, so
   * markdown/frontmatter/YAML raw text (which won't look like JSON and would
   * fail to parse anyway) is safely left as a string.
   */
  const parseJsonEntryContent = (raw: string, pathLooksJson: boolean): unknown => {
    if (pathLooksJson) {
      return JSON.parse(raw);
    }
    const trimmed = raw.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed !== null && typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        // Not actually JSON (e.g. a markdown body that happens to start
        // with a brace) — fall through and keep it as raw text.
      }
    }
    return raw;
  };

  /**
   * Serialize a record's content for the workflow read path, which still
   * crosses the seam as text: `unpublishedEntryDataFile` returns a string that
   * the engine parses with the collection's format. Documents become their
   * JSON text; records already stored as text pass through untouched.
   */
  const contentAsText = (content: unknown): string => typeof content === 'string' ? content : JSON.stringify(content);

  /**
   * Build a seam entry from a protocol record. Every construction site
   * identifies the entry the same way: by the record's opaque content-version
   * token, falling back to the key for repositories that do not advertise
   * `versionTracking`.
   */
  const recordToBackendEntry = (
    record: { key: string, content: unknown, version?: string | undefined },
  ): BackendEntry => ({
    file: { path: record.key, id: record.version || record.key },
    content: recordContent(record.content),
  });

  type ChangesSupport = { syncToken: boolean, changeFeed: boolean };

  const NO_CHANGES_SUPPORT: ChangesSupport = { syncToken: false, changeFeed: false };

  /**
   * Request deduplication cache to reduce duplicate requests
   * Decap CMS makes many redundant requests in parallel, this helps reduce API load
   * by returning the same promise for concurrent requests to the same resource
   */
  interface CacheEntry<T> {
    data: T;
    timestamp: number;
  }

  const CACHE_TTL = 5000; // 5 seconds cache TTL

  // Number of entries returned per UI page in the collection list / media library.
  // Matches the page size used by decap-cms-backend-github (20).
  const ENTRIES_PAGE_SIZE = 20;

  class DedupeCache<T> {
    private cache = new Map<string, CacheEntry<T>>();
    private pending = new Map<string, Promise<T>>();

    get(key: string): T | undefined {
      const entry = this.cache.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        this.cache.delete(key);
        return undefined;
      }
      return entry.data;
    }

    set(key: string, data: T): void {
      this.cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Get or fetch with deduplication
     * If a request is already in-flight, return the same promise
     */
    async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
      // Check cache first
      const cached = this.get(key);
      if (cached !== undefined) {
        return cached;
      }

      // Check if request is already in-flight
      const pending = this.pending.get(key);
      if (pending) {
        return pending;
      }

      // Start new request
      const promise = fetcher().then(
        data => {
          this.set(key, data);
          this.pending.delete(key);
          return data;
        },
        error => {
          this.pending.delete(key);
          throw error;
        },
      );

      this.pending.set(key, promise);
      return promise;
    }

    clear(): void {
      this.cache.clear();
      // Don't clear pending - let them complete
    }

    invalidate(keyPrefix: string): void {
      for (const key of this.cache.keys()) {
        if (key.startsWith(keyPrefix)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Laika CMS Backend Implementation
   *
   * Uses DocumentsRepository for all document operations (entries, unpublished, etc.)
   * and StorageRepository for media file operations.
   */
  /**
   * The wire shape of a lock from `@laikacms/server/api`'s `/locks` endpoint.
   * `token` is present only on acquire/refresh responses, never on a read.
   */
  interface LockResponseData {
    key: string;
    owner: { id: string, name: string };
    acquiredAt: string;
    expiresAt: string;
    token?: string;
  }

  return class LaikaBackend implements Implementation {
    config: Config;
    mediaFolder: string;
    publicFolder: string;
    apiUrl: string;
    acceptRoles?: string[];
    tokenPromise: (() => Promise<string>) | undefined;
    baseUrl: string;
    /** OAuth client_id — the token endpoint validates it on every grant, including refresh. */
    appId: string | undefined;
    tokenUrl: string;
    tokenContentType: string;

    /**
     * The live token triple. `tokenPromise` re-reads this on every call, so a
     * page left open past the access token's lifetime transparently refreshes
     * instead of replaying a stale closure-captured token forever.
     */
    private tokenState: TokenState | undefined;
    /**
     * The server ROTATES the pair on refresh (the old session is revoked
     * server-side), so concurrent callers must share one in-flight refresh —
     * a second request with the same refresh token is an invalid_grant.
     */
    private refreshInFlight: Promise<string> | undefined;
    private onSessionExpired: (() => void) | undefined;

    assetsRepository: AssetsRepository | undefined;
    documentsRepository: DocumentsRepository | undefined;

    // Resolved once per session; reset on logout.
    changesSupport: Promise<ChangesSupport> | undefined;

    // Caches to reduce duplicate requests
    entryCache = new DedupeCache<BackendEntry>();
    unpublishedEntryCache = new DedupeCache<UnpublishedEntry>();
    unpublishedEntriesListCache = new DedupeCache<string[]>();
    // Full entry lists keyed by folder — populated by entriesByFolder, read by traverseCursor
    allEntriesCache = new Map<string, BackendEntry[]>();
    /**
     * Lock tokens for entries this session currently holds, keyed by path.
     *
     * The server authorises refresh and release on the opaque token, not on
     * identity, so the client has to keep it. `CmsImplementation` deliberately
     * knows nothing about tokens: they are a detail of this backend's protocol,
     * not of the editor's lock model.
     */
    private entryLockTokens = new Map<string, string>();

    /**
     * Optional pre-shared token for local-dev / same-origin embedded setups.
     * When set (via `config.backend.dev_token`), the PKCE OAuth dance is
     * skipped: `authComponent` auto-logs in with this token, `restoreUser`
     * ignores `sessionStorage` and re-authenticates with it directly.
     *
     * The embedded server must be configured to accept the same token —
     * see `createEmbeddedLaika({ auth: { mode: 'dev', devToken } })`.
     */
    devToken: string | undefined;

    constructor(config: Config, options: LaikaBackendInitOptions = {}) {
      this.config = config;
      // How we report an unrecoverable session expiry (dead refresh grant)
      // upward, so the app can log the user out.
      this.onSessionExpired = options.onSessionExpired;
      this.mediaFolder = config.media_folder ?? '';
      // public_folder is used for the path that appears in content. When not
      // set, we use media_folder so paths match what Decap CMS expects.
      this.publicFolder = config.public_folder ?? this.mediaFolder;

      const backend: typeof config.backend & LaikaBackendSettings = config.backend;
      this.baseUrl = Url.normalize(backend.base_url);
      // api_root is the canonical field; api_url is the accepted alias.
      this.apiUrl = Url.combine(this.baseUrl, backend.api_root ?? backend.api_url);
      this.devToken = backend.dev_token;
      // Same fields/defaults as PKCEAuthenticationPage, so the refresh grant
      // hits the endpoint the login grant used.
      this.appId = backend.app_id;
      this.tokenUrl = Url.combine(this.baseUrl, backend.auth_token_endpoint ?? 'oauth2/token');
      this.tokenContentType = backend.auth_token_endpoint_content_type
        ?? 'application/x-www-form-urlencoded; charset=utf-8';
    }

    isGitBackend() {
      return false;
    }

    /**
     * Get file extension from MIME type
     */
    private getExtensionFromMimeType(mimeType: string): string | null {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'image/tiff': 'tiff',
        'image/avif': 'avif',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/ogg': 'ogv',
        'audio/mpeg': 'mp3',
        'audio/ogg': 'ogg',
        'audio/wav': 'wav',
        'application/pdf': 'pdf',
        'application/json': 'json',
        'text/plain': 'txt',
        'text/html': 'html',
        'text/css': 'css',
        'text/javascript': 'js',
        'application/zip': 'zip',
      };
      return mimeToExt[mimeType] || null;
    }

    async status() {
      try {
        const response = await fetch(`${this.apiUrl}/health`);
        const api = response.ok;

        let auth = false;
        if (api && this.tokenPromise) {
          try {
            const token = await this.tokenPromise();
            auth = !!token;
          } catch (e) {
            console.warn('Failed getting access token', e);
            auth = false;
          }
        }

        return {
          auth: { status: auth },
          api: { status: api, statusPage: this.apiUrl },
        };
      } catch (e) {
        console.warn('Failed getting Laika Backend status', e);
        return {
          auth: { status: false },
          api: { status: false, statusPage: this.apiUrl },
        };
      }
    }

    authComponent(): React.ComponentType<any> {
      if (this.devToken) {
        const devToken = this.devToken;
        // Closure-captured dev token so the auth component doesn't need
        // its own Config plumbing — Decap renders `authComponent()` with
        // its own prop set.
        return function DevAuthPageWithToken(props: Record<string, unknown>) {
          return React.createElement(DevAuthenticationPage, {
            ...(props as object),
            devToken,
          } as never);
        };
      }
      return PKCEAuthenticationPage;
    }

    private static SESSION_TOKEN_KEY = 'laika_access_token';
    private static REFRESH_TOKEN_KEY = 'laika_refresh_token';
    private static TOKEN_EXPIRES_AT_KEY = 'laika_token_expires_at';
    /** Refresh this long before actual expiry so in-flight requests don't race the deadline. */
    private static TOKEN_REFRESH_SKEW_MS = 60_000;

    private loadStoredTokenState(): TokenState | null {
      if (typeof sessionStorage === 'undefined') return null;
      const accessToken = sessionStorage.getItem(LaikaBackend.SESSION_TOKEN_KEY);
      if (!accessToken) return null;
      const refreshToken = sessionStorage.getItem(LaikaBackend.REFRESH_TOKEN_KEY);
      const rawExpiresAt = sessionStorage.getItem(LaikaBackend.TOKEN_EXPIRES_AT_KEY);
      const parsedExpiresAt = rawExpiresAt === null ? NaN : Number(rawExpiresAt);
      return {
        accessToken,
        ...(refreshToken === null ? {} : { refreshToken }),
        ...(Number.isFinite(parsedExpiresAt) ? { expiresAt: parsedExpiresAt } : {}),
      };
    }

    private persistTokenState(state: TokenState) {
      if (typeof sessionStorage === 'undefined') return;
      // SESSION_TOKEN_KEY is a public contract: host apps read it directly to
      // authorize their own API calls, so a refresh must rewrite it in place.
      sessionStorage.setItem(LaikaBackend.SESSION_TOKEN_KEY, state.accessToken);
      if (state.refreshToken) {
        sessionStorage.setItem(LaikaBackend.REFRESH_TOKEN_KEY, state.refreshToken);
      } else {
        sessionStorage.removeItem(LaikaBackend.REFRESH_TOKEN_KEY);
      }
      if (state.expiresAt != null) {
        sessionStorage.setItem(LaikaBackend.TOKEN_EXPIRES_AT_KEY, String(state.expiresAt));
      } else {
        sessionStorage.removeItem(LaikaBackend.TOKEN_EXPIRES_AT_KEY);
      }
    }

    private clearStoredTokenState() {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.removeItem(LaikaBackend.SESSION_TOKEN_KEY);
      sessionStorage.removeItem(LaikaBackend.REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(LaikaBackend.TOKEN_EXPIRES_AT_KEY);
    }

    /**
     * The session is definitively over (no refresh token, or the grant came
     * back invalid). Clear everything and report upward, so the app can swap
     * to the login screen instead of rendering dead 401s as not-found pages.
     */
    private dropExpiredSession() {
      this.tokenState = undefined;
      this.clearStoredTokenState();
      this.onSessionExpired?.();
    }

    /**
     * Returns a currently-valid access token, refreshing via the OAuth
     * refresh grant when the stored one is at/near expiry. This is what
     * `tokenPromise` points at — evaluated per call, never a cached token.
     */
    private async ensureActiveToken(): Promise<string> {
      if (this.devToken) return this.devToken;
      const state = this.tokenState;
      if (!state) {
        throw new AccessTokenError('Not authenticated');
      }
      const usable = state.expiresAt == null
        || Date.now() < state.expiresAt - LaikaBackend.TOKEN_REFRESH_SKEW_MS;
      if (usable) return state.accessToken;

      if (!state.refreshToken) {
        this.dropExpiredSession();
        throw new AccessTokenError('User session expired. Please log in again.');
      }

      this.refreshInFlight ??= this.refreshAccessToken(state.refreshToken)
        .finally(() => {
          this.refreshInFlight = undefined;
        });
      return this.refreshInFlight;
    }

    /**
     * `CmsImplementation.ensureFreshSession`: refresh now (instead of on the
     * next request) when the token is at/near expiry. Resolves without a
     * network call while the token is fresh. A dead refresh grant surfaces
     * through `dropExpiredSession` -> `onSessionExpired` inside
     * `ensureActiveToken`; the rejection itself is for transient errors,
     * which callers may ignore (the lazy per-request refresh retries later).
     */
    async ensureFreshSession(): Promise<void> {
      if (!this.tokenState && !this.devToken) return;
      await this.ensureActiveToken();
    }

    private async refreshAccessToken(refreshToken: string): Promise<string> {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        ...(this.appId ? { client_id: this.appId } : {}),
      });

      let response: Response;
      try {
        response = await unsentRequest.fetchWithTimeout(this.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': this.tokenContentType },
          body: body.toString(),
        });
      } catch (error) {
        // Network failure: keep the stored pair so a later call can retry.
        throw new AccessTokenError(`Token refresh failed: ${(error as Error).message}`);
      }

      if (!response.ok) {
        // 400/401 = the grant itself is dead (expired, revoked, or rotated
        // away by another refresh). Anything else may be transient — keep
        // the pair so the next call retries.
        if (response.status === 400 || response.status === 401) {
          this.dropExpiredSession();
        }
        throw new AccessTokenError(`Token refresh failed (HTTP ${response.status})`);
      }

      const data = await response.json() as {
        access_token: string,
        refresh_token?: string,
        expires_in?: number,
      };
      const next: TokenState = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        ...(typeof data.expires_in === 'number'
          ? { expiresAt: Date.now() + data.expires_in * 1000 }
          : {}),
      };
      this.tokenState = next;
      this.persistTokenState(next);
      return next.accessToken;
    }

    restoreUser() {
      // Dev mode: always use the dev token — ignore whatever happens to be
      // in sessionStorage from a previous (real) login.
      if (this.devToken) {
        return this.authenticate({ token: this.devToken });
      }
      // Try to restore user from session storage
      const stored = this.loadStoredTokenState();

      if (!stored) {
        return Promise.reject(
          new AccessTokenError('User session expired. Please log in again.'),
        );
      }

      // Re-authenticate with the stored triple; authenticate() refreshes
      // first when the access token already sat out its lifetime.
      const credentials: LaikaCredentials = {
        token: stored.accessToken,
        ...(stored.refreshToken === undefined ? {} : { refresh_token: stored.refreshToken }),
        ...(stored.expiresAt === undefined ? {} : { token_expires_at: stored.expiresAt }),
      };
      return this.authenticate(credentials);
    }

    async authenticate(credentials: Credentials) {
      const user: LaikaCredentials = credentials;
      const token = user.token || user.access_token;

      if (!token) {
        throw new AccessTokenError('No access token provided');
      }
      if (typeof token !== 'string') {
        // Core's `CmsCredentials.token` also allows an object (git backends
        // carry structured credentials); this backend sends a bearer token.
        throw new AccessTokenError('Expected a bearer access token string');
      }

      // `expires_in` (seconds) comes from a fresh token-endpoint response;
      // `token_expires_at` (epoch ms) from restoreUser's stored state.
      const expiresAt = user.token_expires_at
        ?? (typeof user.expires_in === 'number' ? Date.now() + user.expires_in * 1000 : undefined);
      this.tokenState = {
        accessToken: token,
        ...(user.refresh_token === undefined ? {} : { refreshToken: user.refresh_token }),
        ...(expiresAt === undefined ? {} : { expiresAt }),
      };
      this.tokenPromise = () => this.ensureActiveToken();

      try {
        // Refreshes first when the token we were handed is already expired
        // (e.g. a tab reopened hours later restoring from sessionStorage).
        const activeToken = await this.ensureActiveToken();

        // Fetch session data from the /session endpoint
        const sessionResponse = await unsentRequest.fetchWithTimeout(
          TL.url`${this.apiUrl}/session`,
          {
            headers: { Authorization: `Bearer ${activeToken}` },
          },
        );

        if (!sessionResponse.ok) {
          // If token is invalid, clear stored token
          this.tokenState = undefined;
          this.clearStoredTokenState();
          const errorText = await sessionResponse.text();
          throw new AccessTokenError(
            `Laika Backend Error: ${errorText}`,
          );
        }

        const sessionData = await sessionResponse.json();
        const userAttributes = sessionData.data?.attributes || sessionData;
        const rawScopes = userAttributes.scopes ?? userAttributes.scope;

        // Extract user data from session response
        const userData = {
          name: userAttributes.name || userAttributes.email || 'Unknown',
          email: userAttributes.email || '',
          avatar_url: userAttributes.avatar_url || userAttributes.picture,
          scopes: Array.isArray(rawScopes)
            ? rawScopes.filter((scope): scope is string => typeof scope === 'string')
            : typeof rawScopes === 'string'
            ? rawScopes.split(/\s+/).filter(Boolean)
            : [],
          metadata: {},
        };

        // Persist the full triple for restoreUser (ensureActiveToken may
        // have rotated it above, in which case this is already stored —
        // persisting the current state is idempotent either way).
        if (this.tokenState) {
          this.persistTokenState(this.tokenState);
        }

        // Initialize repositories
        this.assetsRepository = getAssetsRepository({
          tokenPromise: this.tokenPromise,
          baseUrl: this.apiUrl,
        });

        this.documentsRepository = getDocumentsRepository({
          tokenPromise: this.tokenPromise,
          baseUrl: this.apiUrl,
        });

        // Deliberately without `token`, which core's `CmsUser` declares as
        // required: the returned user is handed to the app's auth store,
        // and this backend keeps its tokens in sessionStorage only (see
        // persistTokenState). `restoreUser` re-reads them from there rather
        // than from the stored user, so nothing needs the token here.
        return {
          name: userData.name,
          login: userData.email,
          avatar_url: userData.avatar_url,
          scopes: userData.scopes,
        } as User;
      } catch (error) {
        console.error(error);
        if (error instanceof APIError) {
          throw error;
        }
        throw new APIError(
          `Authentication failed: ${(error as Error).message}`,
          401,
          'Laika Backend',
        );
      }
    }

    async logout() {
      // Clear stored tokens from session storage
      this.clearStoredTokenState();
      this.tokenState = undefined;
      this.tokenPromise = undefined;
      this.assetsRepository = undefined;
      this.documentsRepository = undefined;
      this.changesSupport = undefined;
      this.entryLockTokens.clear();
      this.entryCache.clear();
      this.unpublishedEntryCache.clear();
      this.unpublishedEntriesListCache.clear();
    }

    getToken() {
      if (!this.tokenPromise) {
        throw new AccessTokenError('Not authenticated');
      }
      return this.tokenPromise();
    }

    /**
     * Mint a short-lived, single-use QR login transfer code for the CURRENT
     * session (DCMS-1401 — "quick mobile access"). Used by laika-app's
     * settings UI to render a QR code that a second device scans to open an
     * already-authenticated session without a full PKCE re-login. See
     * `backends/laika/qrLogin.ts` for the full client/server contract.
     */
    async createQrLoginTransfer(): Promise<QrTransferCode> {
      const token = await this.ensureActiveToken();
      return requestQrTransferCode(this.apiUrl, token);
    }

    /**
     * Get the documents repository
     */
    getDocumentsRepo(): DocumentsRepository {
      if (!this.documentsRepository) {
        throw new AccessTokenError('Not authenticated - documents repository not initialized');
      }
      return this.documentsRepository;
    }

    /**
     * Get the assets repository for media operations
     */
    getAssetsRepo(): AssetsRepository {
      if (!this.assetsRepository) {
        throw new AccessTokenError('Not authenticated - assets repository not initialized');
      }
      return this.assetsRepository;
    }

    // ===== ENTRY OPERATIONS (using DocumentsRepository) =====

    private async _fetchAllEntriesFromRepo(folder: string): Promise<BackendEntry[]> {
      const repo = this.getDocumentsRepo();
      const entries: BackendEntry[] = [];
      const repoPageSize = 100;
      let offset = 0;

      while (true) {
        const pagination: Pagination = { limit: repoPageSize, offset };
        const result = await collectStream(
          repo.listRecords({ pagination, folder, type: 'published', depth: 10 }),
        );
        if (Result.isFailure(result)) throw result.failure;

        for (const record of result.success) {
          if (record.type === 'published') {
            const entry = recordToBackendEntry(record);
            entries.push(entry);
            this.entryCache.set(record.key, entry);
          }
        }

        if (result.success.length < repoPageSize) break;
        offset += repoPageSize;
      }

      return entries;
    }

    private _buildPageCursor(folder: string, allEntries: BackendEntry[], page: number): {
      cursor: Cursor,
      pageEntries: BackendEntry[],
    } {
      const pageCount = Math.max(1, Math.ceil(allEntries.length / ENTRIES_PAGE_SIZE));
      const clampedPage = Math.max(1, Math.min(page, pageCount));
      const actions: string[] = [];
      if (clampedPage > 1) {
        actions.push('prev', 'first');
      }
      if (clampedPage < pageCount) {
        actions.push('next', 'last');
      }
      const cursor = Cursor.create({
        actions,
        meta: { page: clampedPage, pageSize: ENTRIES_PAGE_SIZE, pageCount, count: allEntries.length },
        data: { folder },
      });
      const pageEntries = allEntries.slice(
        (clampedPage - 1) * ENTRIES_PAGE_SIZE,
        clampedPage * ENTRIES_PAGE_SIZE,
      );
      return { cursor, pageEntries };
    }

    async entriesByFolder(folder: string, _extension: string, _depth: number): Promise<BackendEntry[]> {
      const allEntries = await this._fetchAllEntriesFromRepo(folder);
      this.allEntriesCache.set(folder, allEntries);

      const { cursor, pageEntries } = this._buildPageCursor(folder, allEntries, 1);
      // Attach cursor so Decap's Backend can track pagination position.
      (pageEntries as CursorCompatibleEntries<BackendEntry>)[CURSOR_COMPATIBILITY_SYMBOL] = cursor;
      return pageEntries;
    }

    async allEntriesByFolder(
      folder: string,
      _extension: string,
      _depth: number,
      pathRegex?: RegExp,
    ): Promise<BackendEntry[]> {
      const entries = await this._fetchAllEntriesFromRepo(folder);

      if (pathRegex) {
        return entries.filter(entry => pathRegex.test(entry.file.path));
      }

      return entries;
    }

    async entriesByFiles(files: ImplementationFile[]): Promise<BackendEntry[]> {
      const entries: BackendEntry[] = [];

      for (const file of files) {
        try {
          const entry = await this.getEntry(file.path);
          entries.push(entry);
        } catch (error) {
          console.error(`Error getting entry for ${file.path}:`, error);
        }
      }

      return entries;
    }

    // `useWorkflow` defaults to `true` so every existing call site (entriesByFiles,
    // EditorControl, actions/entries.tsx, ...) keeps probing both published and
    // unpublished storage, since those callers don't know the entry's actual
    // publish state up front. Only `Backend.entryExist` (core/backend.tsx) passes
    // the collection's real editorial-workflow flag, so it can skip the
    // `getUnpublished` probe for non-workflow collections, where an unpublished
    // record can never exist (DCMS-1663).
    async getEntry(path: string, useWorkflow = true): Promise<BackendEntry> {
      const key = normalizeKey(path);

      // Use getOrFetch for request deduplication
      return this.entryCache.getOrFetch(key, async () => {
        const repo = this.getDocumentsRepo();

        const failedResults: LaikaError[] = [];

        const result = await firstResult(repo.getDocument(key));

        if (Result.isSuccess(result)) {
          return recordToBackendEntry(result.success);
        } else {
          failedResults.push(result.failure);
        }

        if (useWorkflow) {
          const unpublishedResult = await firstResult(repo.getUnpublished(key));

          if (Result.isSuccess(unpublishedResult)) {
            return recordToBackendEntry(unpublishedResult.success);
          } else {
            failedResults.push(unpublishedResult.failure);
          }
        }

        const errors = failedResults.map(fr => `Code: ${fr.code}, Message: ${fr.message}`).join('; ');
        const status: ErrorCode = failedResults[0]?.code ?? errorCode.INTERNAL_ERROR;

        // A miss here is the expected outcome whenever core's `entryExist` probes a
        // fresh slug (e.g. new-entry save collision checks) — it always misses, and
        // the caller already treats that as a normal "no such entry" via .catch().
        // Only surface unexpected failures (auth, malformed responses, 5xx) as errors.
        const allNotFound = failedResults.every(fr => fr.code === errorCode.NOT_FOUND);
        if (!allNotFound) {
          console.error(`Failed to fetch entry for key: ${key}. Errors: ${errors}`);
        }

        throw new APIError(errors, ErrorCodeToStatusMap[status], 'Laika Backend');
      });
    }

    // ===== CONTENT SYNC (capability-gated; powers core's freshness polling) =====

    private _getChangesSupport(): Promise<ChangesSupport> {
      const repo = this.documentsRepository;
      if (!repo) return Promise.resolve(NO_CHANGES_SUPPORT);

      this.changesSupport ??= (async () => {
        const result = await firstResult(repo.getCapabilities());
        if (Result.isFailure(result)) {
          handleRecoverableWarning(result.failure);
          return NO_CHANGES_SUPPORT;
        }
        const { changes } = result.success;
        return changes.supported
          ? { syncToken: changes.syncToken, changeFeed: changes.changeFeed }
          : NO_CHANGES_SUPPORT;
      })();
      return this.changesSupport;
    }

    /**
     * Opaque store-wide content-version token, or null when the repository does
     * not advertise the capability. Null keeps core's freshness poller inert.
     */
    async getSyncToken(): Promise<string | null> {
      const support = await this._getChangesSupport();
      if (!support.syncToken) return null;

      const result = await firstResult(this.getDocumentsRepo().getSyncToken());
      if (Result.isFailure(result)) {
        handleRecoverableWarning(result.failure);
        return null;
      }
      return result.success;
    }

    /**
     * Changed record keys since a previous sync token, or null without the
     * change-feed capability (core then invalidates coarsely on token change).
     */
    async getChanges(
      since: string,
    ): Promise<{ changes: { path: string, deleted: boolean }[], token: string } | null> {
      const support = await this._getChangesSupport();
      if (!support.changeFeed) return null;

      // Core round-trips the token as an opaque string (it never parses one),
      // so re-apply the protocol's brand on the way back in.
      const result = await collectStream(
        this.getDocumentsRepo().listChanges({ since: SyncToken.make(since) }),
      );
      if (Result.isFailure(result)) throw result.failure;

      const changes = result.success.map(change => ({
        path: change.key,
        deleted: change.deleted,
      }));
      // The local collectStream discards the stream's done value, so fetch the
      // next poll token separately. It is read after the feed, so any change
      // landing in between is picked up by the next diff rather than lost.
      const token = await this.getSyncToken();
      return { changes, token: token ?? since };
    }

    // Update published options:
    // collectionName: "articles"
    // commitMessage : "Update Articles “test2”"
    // newEntry: false
    // status: undefined
    // unpublished: false
    // useWorkflow: true

    // Unpublish options:
    // collectionName: "articles"
    // commitMessage : "Unpublish Articles “test2”"
    // newEntry: false
    // status: "draft"
    // unpublished: true
    // useWorkflow: true
    async persistEntry(entry: Entry, options: PersistOptions): Promise<void> {
      // Convert every data file up front, before any network request: the
      // conversion is what rejects non-JSON collections (DCMS-1638), and it
      // must run BEFORE the asset-upload loop below, because uploading an
      // asset for an entry whose content persist is doomed to fail orphans
      // that asset server-side and contradicts this backend's README promise
      // that no request reaches the server before the format check.
      //
      // ALL data files are persisted, which matters for i18n with the
      // multiple_folders structure: each locale gets its own file
      // (e.g. pages/en/index.json, pages/nl/index.json).
      const documents = entry.dataFiles.map(dataFile => ({
        key: normalizeKey(dataFile.path),
        content: toDocumentContent(dataFile, options.collectionName),
      }));

      // First, persist any assets (images, files) that are part of this entry
      // These are AssetProxy objects that need to be uploaded before the entry is saved
      if (entry.assets && entry.assets.length > 0) {
        for (const asset of entry.assets) {
          try {
            await this.persistMedia(asset, options);
          } catch (error) {
            console.error(`Failed to persist asset ${asset.path}:`, error);
            throw error;
          }
        }
      }

      const repo = this.getDocumentsRepo();

      for (const { key: entryKey, content } of documents) {
        const language = typeof content['language'] === 'string' ? content['language'] : 'und';

        if (options.useWorkflow && typeof options.status === 'string' && options.status !== 'published') {
          const newEntry = options.newEntry || options.unpublished === false;
          if (newEntry) {
            await runTask(
              repo.createUnpublished({
                type: 'unpublished',
                status: options.status || 'draft',
                key: entryKey,
                language,
                content,
              }),
              'Failed to persist new unpublished entry',
            );
          } else {
            await runTask(
              repo.updateUnpublished({ key: entryKey, content, status: options.status }),
              'Failed to update unpublished entry',
            );
          }
        } else {
          // Published document
          if (options.newEntry) {
            await runTask(
              repo.createDocument({
                type: 'published',
                status: 'published',
                key: entryKey,
                language,
                content,
              }),
              'Failed to persist new entry',
            );
          } else {
            await runTask(
              repo.updateDocument({ key: entryKey, content }),
              'Failed to update entry',
            );
          }
        }
      }

      // Invalidate caches for all persisted entries
      for (const { key } of documents) {
        this.entryCache.invalidate(key);
        this.unpublishedEntryCache.invalidate(key);
      }
      this.unpublishedEntriesListCache.clear();
    }

    async deleteFiles(paths: string[], _commitMessage: string): Promise<void> {
      // Media-library paths are public_folder-prefixed (see getMedia). The
      // documents repository cannot delete those — and since document-delete
      // failures fall through silently here, routing media paths to it made
      // the UI report success while the stored asset survived. Split by the
      // public-folder prefix and send media deletes to the assets repository.
      const publicFolder = this.publicFolder;
      const mediaPrefix = publicFolder && publicFolder !== '.'
        ? `${publicFolder.replace(/\/$/, '')}/`
        : '';
      const mediaPaths = mediaPrefix ? paths.filter(path => path.startsWith(mediaPrefix)) : [];
      const documentPaths = mediaPrefix ? paths.filter(path => !path.startsWith(mediaPrefix)) : paths;

      if (documentPaths.length > 0) {
        const repo = this.getDocumentsRepo();

        for (const path of documentPaths) {
          const key = normalizeKey(path);
          // Try to delete as document first
          const docResult = await firstResult(repo.deleteDocument(key));
          if (Result.isSuccess(docResult)) {
            continue;
          }
          // Fall back to delete-as-unpublished
          await firstResult(repo.deleteUnpublished(key));
        }
      }

      if (mediaPaths.length === 0) return;

      const assetsRepo = this.getAssetsRepo();
      for (const path of mediaPaths) {
        await runTask(
          assetsRepo.deleteAsset(this.getStorageKey(path)),
          `Failed to delete media ${path}`,
        );
      }
    }

    // ===== MEDIA OPERATIONS (using AssetsRepository) =====

    /**
     * Construct the public path for a media file
     * This is the path that will be used in content and for lookups
     */
    private getPublicPath(filename: string): string {
      const name = filename.split('/').pop() || filename;
      const publicFolder = this.publicFolder;

      // Handle special cases for public folder
      if (!publicFolder || publicFolder === '.' || publicFolder === '') {
        return name;
      }

      // Join public folder with filename
      return `${publicFolder.replace(/\/$/, '')}/${name}`;
    }

    /**
     * Paginated media surface (see CmsImplementation). Pagination requires
     * the assets backend to support cursor listing; dynamic search requires
     * a declared `search` filter. When the deployed assets API advertises
     * neither, this reports false and the media library falls back to the
     * full `getMedia()` load.
     */
    async getMediaCapabilities(): Promise<CmsMediaCapabilities> {
      const repo = this.getAssetsRepo();
      const caps = await firstResult(repo.getCapabilities());
      if (Result.isFailure(caps)) {
        return { pagination: false, dynamicSearch: false };
      }
      const { pagination, filtering } = caps.success;
      return {
        pagination: pagination.supported && pagination.styles.cursor,
        dynamicSearch: filtering?.supported === true
          && filtering.filters.some(filter => filter.name === 'search'),
      };
    }

    /**
     * Fetch one page of media via the assets repo's cursor pagination: one
     * listing request per page (plus cached URL resolution), instead of the
     * legacy drain-everything loop in getMedia. The server's assets domain
     * requires the folder key to carry a collection prefix (DCMS-1063), so
     * the listing is scoped to the configured `media_folder` rather than the
     * bare root; `path` carries the public_folder-prefixed public path.
     */
    async getMediaPage(opts: CmsGetMediaPageOptions): Promise<CmsMediaPage> {
      const repo = this.getAssetsRepo();
      const { cursor, query, perPage = 100, folderSupport } = opts;

      const result = await collectStreamWithDone(
        repo.listResources(this.mediaFolder, {
          depth: Infinity,
          pagination: { after: cursor, perPage },
          hints: { urls: true },
          ...(query ? { filters: { search: query } } : {}),
        }),
      );
      if (Result.isFailure(result)) {
        throw apiError('Failed to list media')(result.failure);
      }

      const assets = result.success.data.filter((r: Resource): r is Asset => r.type === 'asset');

      // One batched URL resolution for the whole page; the listing's
      // `urls` hint already primed the proxy's cache, so this is local.
      const urls = await runStream(repo.getUrls(assets), 'Failed to get media URLs');
      const urlByKey = new Map(urls.map(u => [u.key, u.url]));

      const files = assets.map((resource): ImplementationMediaFile => {
        const displayUrl = urlByKey.get(resource.key);
        if (!displayUrl) {
          throw new APIError(`No URL available for asset: ${resource.key}`, 500, 'Laika Backend');
        }
        // Same path semantics as getMedia: `path` must be the PUBLIC path
        // (public_folder-prefixed) or the picker filters the file out;
        // `displayURL`/`url` carry the publicly-loadable URL.
        return {
          id: resource.key,
          name: resource.key.split('/').pop() || resource.key,
          size: (resource.content as { size?: number })?.size || 0,
          displayURL: displayUrl,
          path: this.getPublicPath(resource.key),
          url: displayUrl,
        };
      });

      // Mirrors getMedia's folder handling: only surface directory entries
      // when the caller opts in via folderSupport, so callers that don't
      // understand isDirectory keep seeing the flattened file list.
      const folderFiles: ImplementationMediaFile[] = folderSupport
        ? result.success.data
          .filter((r: Resource): r is Resource & { type: 'folder' } => r.type === 'folder')
          .map(resource => ({
            id: resource.key,
            name: resource.key.split('/').pop() || resource.key,
            size: 0,
            displayURL: this.getPublicPath(resource.key),
            path: this.getPublicPath(resource.key),
            isDirectory: true,
          }))
        : [];

      const donePagination = result.success.done.pagination;
      const nextCursor = donePagination && 'after' in donePagination ? donePagination.after : undefined;
      return { files: [...folderFiles, ...files], ...(nextCursor ? { nextCursor } : {}) };
    }

    async getMedia(
      mediaFolder = this.mediaFolder,
      folderSupport?: boolean,
    ): Promise<ImplementationMediaFile[]> {
      const repo = this.getAssetsRepo();
      const media: ImplementationMediaFile[] = [];
      const repoPageSize = 100;
      let offset = 0;

      // Match the old behaviour: if listResources fails (e.g. the caller has
      // no configured media_folder), route the failure through the warning
      // handler and return whatever we have so far. The old AsyncGenerator
      // yielded a Result.fail that the loop ignored; the new stream THROWS
      // the LaikaError instead.
      try {
        while (true) {
          const pagination: Pagination = { limit: repoPageSize, offset };
          let totalItemsThisPage = 0;

          // The server's assets domain requires the folder key to carry a
          // collection prefix (DCMS-1063: an unscoped '' folderKey 400s with
          // "missing a collection prefix"), so the listing is scoped to the
          // configured media_folder rather than the bare root.
          for await (
            const chunk of repo.listResources(mediaFolder, {
              depth: Infinity,
              pagination,
              hints: { urls: true },
            })
          ) {
            for (const el of chunk) {
              if (el._tag === 'RecoverableError') {
                handleRecoverableWarning(el.error);
                continue;
              }
              if (el._tag !== 'Data') continue;
              totalItemsThisPage++;
              const resource = el.value;
              if (resource.type === 'folder') {
                if (!folderSupport) continue;
                media.push({
                  id: resource.key,
                  name: resource.key.split('/').pop() || resource.key,
                  size: 0,
                  displayURL: this.getPublicPath(resource.key),
                  path: this.getPublicPath(resource.key),
                  isDirectory: true,
                });
                continue;
              }
              if (resource.type !== 'asset') continue;
              // Get the URL for display
              for await (const urlsChunk of repo.getUrls([resource])) {
                for (const urlEl of urlsChunk) {
                  if (urlEl._tag === 'RecoverableError') {
                    throw new APIError(
                      `Failed to get media URLs: ${urlEl.error.message}`,
                      ErrorCodeToStatusMap[urlEl.error.code as ErrorCode],
                      'Laika Backend',
                    );
                  }
                  if (urlEl._tag !== 'Data') continue;
                  const displayUrl = urlEl.value.url;
                  if (!displayUrl) {
                    throw new APIError(`No URL available for asset: ${resource.key}`, 500, 'Laika Backend');
                  }
                  // Storage keys are flat (no folder prefix), but Decap filters
                  // media by `dirname(file.path) === media_folder` and inserts
                  // `path` into content. So `path` must be the PUBLIC path
                  // (public_folder-prefixed, e.g. "assets/uploads/logo.svg"),
                  // not the bare storage key. `displayURL` and `url` carry the
                  // publicly-loadable URL instead. Mixing these up makes every
                  // existing media file invisible in the picker.
                  media.push({
                    id: resource.key,
                    name: resource.key.split('/').pop() || resource.key,
                    size: (resource.content as { size?: number })?.size || 0,
                    displayURL: displayUrl,
                    path: this.getPublicPath(resource.key),
                    url: displayUrl,
                  });
                }
              }
            }
          }

          if (totalItemsThisPage < repoPageSize) break;
          offset += repoPageSize;
        }
      } catch (err) {
        if (err instanceof LaikaError) {
          handleRecoverableWarning(err);
        } else {
          throw err;
        }
      }

      return media;
    }

    async getMediaDisplayURL(displayURL: DisplayURL): Promise<string> {
      if (typeof displayURL === 'string') {
        return displayURL;
      }

      const { id: _id, path } = displayURL as { id: string, path: string };

      const mediaFile = await this.getMediaFile(path);
      return mediaFile.url;
    }

    /**
     * Extract the storage key from a public path
     * If public_folder is "assets/uploads" and path is "assets/uploads/x.jpg",
     * the storage key is "x.jpg"
     */
    private getStorageKey(publicPath: string): string {
      const publicFolder = this.publicFolder;

      // If no public folder or it's "." or empty, the path is the key
      if (!publicFolder || publicFolder === '.' || publicFolder === '') {
        return publicPath;
      }

      // Remove the public folder prefix if present
      const prefix = publicFolder.replace(/\/$/, '') + '/';
      if (publicPath.startsWith(prefix)) {
        return publicPath.slice(prefix.length);
      }

      // If the path doesn't start with the prefix, it might already be a storage key
      return publicPath;
    }

    async getMediaFile(path: string): Promise<ImplementationMediaFile & { file: File, url: string }> {
      try {
        const repo = this.getAssetsRepo();

        // Convert public path to storage key
        const storageKey = this.getStorageKey(path);

        const asset = await runTask(repo.getAsset(storageKey), 'Failed to get media asset');
        const [{ metadata }] = await runStream(
          repo.getMetadata([asset]),
          'Failed to get media metadata',
        );
        const [{ url }] = await runStream(repo.getUrls([asset]), 'Failed to get media URL');

        if (!url) {
          throw new APIError(`No URL available for asset: ${asset.key}`, 500, 'Laika Backend');
        }

        const name = path.split('/').pop() || path;

        const mimeType = metadata.mimeType || 'application/octet-stream';

        // Create a File object - for now we create an empty file since we don't have the binary content
        // The URL should be used to fetch the actual content
        const blob = new Blob([], { type: mimeType });
        const file = new File([blob], name, { type: mimeType });

        // `path` is the public (public_folder-prefixed) path so it matches
        // what's stored in content (see comment in getMedia above);
        // `url`/`displayURL` carry the public URL.
        const actualFile = {
          id: asset.key,
          name,
          size: (asset.content as { size?: number })?.size || 0,
          displayURL: url,
          path: this.getPublicPath(asset.key),
          file,
          url,
        };

        return actualFile;
      } catch (error) {
        console.error(`Error getting media file for path ${path}:`, error);

        throw new APIError(
          `Failed to get media file for path ${path}: ${(error as Error).message}`,
          500,
          'Laika Backend',
        );
      }
    }

    async persistMedia(mediaFile: AssetProxy, _options: PersistOptions): Promise<ImplementationMediaFile> {
      const repo = this.getAssetsRepo();

      // Read the file content
      const fileBlob = mediaFile.fileObj;

      if (!fileBlob) {
        throw new APIError('No file content provided', 400, 'Laika Backend');
      }

      // mediaFile.path comes from Decap CMS and may include the public folder prefix
      // We need to extract just the filename for storage
      const incomingPath = mediaFile.path;
      const originalFilename = fileBlob.name;

      // Extract just the filename from the path for storage
      // The path might be "assets/uploads/x.jpg" but we store as "x.jpg"
      let storageKey = incomingPath.split('/').pop() || incomingPath;

      // If the key doesn't have an extension, add one based on MIME type
      if (!storageKey.includes('.') && fileBlob.type) {
        const ext = this.getExtensionFromMimeType(fileBlob.type);
        if (ext) {
          storageKey = `${storageKey}.${ext}`;
        }
      }

      // Convert file to Uint8Array for AssetCreate
      const arrayBuffer = await fileBlob.arrayBuffer();
      const content = new Uint8Array(arrayBuffer);

      const createData: AssetCreate = {
        key: storageKey,
        content,
        mimeType: fileBlob.type || 'application/octet-stream',
        filename: originalFilename,
      };

      const newAsset = await runTask(repo.createAsset(createData), 'Failed to persist media');
      const [urlResult] = await runStream(
        repo.getUrls([newAsset]),
        'Failed to get media URL',
      );

      if (!urlResult.url) {
        throw new APIError(`No URL available for newly created asset: ${newAsset.key}`, 500, 'Laika Backend');
      }

      // `path` is the public (public_folder-prefixed) path so Decap's
      // per-field picker filter (`dirname(file.path) === media_folder`)
      // accepts it and content references resolve; `url` / `displayURL`
      // carry the publicly-loadable URL. See the comment in getMedia for
      // the full reasoning.
      const name = newAsset.key.split('/').pop() || newAsset.key;

      const persistedFile: ImplementationMediaFile = {
        id: newAsset.key,
        name,
        size: fileBlob.size,
        displayURL: urlResult.url,
        path: this.getPublicPath(newAsset.key),
        url: urlResult.url,
        file: fileBlob,
      };

      return persistedFile;
    }

    async unpublishedEntries(): Promise<string[]> {
      // Use cache with a fixed key since this returns all unpublished entries
      return this.unpublishedEntriesListCache.getOrFetch('all', async () => {
        const entries: string[] = [];
        const repo = this.getDocumentsRepo();
        const pageSize = 100;

        // Unpublished records are stored per collection folder, so the listing
        // is driven by the configured collections.
        for (const { name: collectionName } of this.config.collections ?? []) {
          let offset = 0;

          while (true) {
            const result = await collectStream(
              repo.listRecords({
                pagination: { limit: pageSize, offset },
                folder: collectionName,
                type: 'unpublished',
                depth: 10,
              }),
            );
            if (Result.isFailure(result)) throw result.failure;

            for (const unpub of result.success) {
              if (unpub.type !== 'unpublished') {
                throw new IllegalStateException(`Expected unpublished type but got ${unpub.type}`);
              }

              entries.push(unpub.key);

              const keyParts = unpub.key.split('/');
              const resolvedCollection = keyParts[0];
              const resolvedSlug = keyParts.slice(1).join('/') || keyParts[keyParts.length - 1];

              const unpublishedEntry: UnpublishedEntry = {
                collection: resolvedCollection,
                slug: resolvedSlug,
                status: unpub.status,
                diffs: [],
                updatedAt: unpub.updatedAt || new Date().toISOString(),
              };
              this.unpublishedEntryCache.set(unpub.key, unpublishedEntry);

              this.entryCache.set(unpub.key, recordToBackendEntry(unpub));
            }

            if (result.success.length < pageSize) break;
            offset += pageSize;
          }
        }

        return entries;
      });
    }

    async unpublishedEntry({
      id,
      collection,
      slug,
    }: {
      id?: string | undefined,
      collection?: string | undefined,
      slug?: string | undefined,
    }): Promise<UnpublishedEntry> {
      // Determine the key - id takes precedence, then construct from collection/slug
      // Normalize to remove file extensions
      let key: string;
      if (id) {
        key = normalizeKey(id);
      } else if (collection && slug) {
        key = normalizeKey(`${collection}/${slug}`);
      } else {
        throw new APIError(
          'Either id or both collection and slug are required to get unpublished entry',
          ErrorCodeToStatusMap[errorCode.BAD_REQUEST],
          'Laika Backend',
        );
      }

      // Use getOrFetch for request deduplication
      return this.unpublishedEntryCache.getOrFetch(key, async () => {
        const repo = this.getDocumentsRepo();
        const unpub = await runTask(
          repo.getUnpublished(key),
          'Failed to get unpublished entry',
        );

        // Extract collection and slug from the key if not provided
        // Key format is typically "collection/slug" or "collection/path/to/slug"
        const keyParts = unpub.key.split('/');
        const resolvedCollection = collection || keyParts[0];
        const resolvedSlug = slug ? normalizeKey(slug) : keyParts.slice(1).join('/') || keyParts[keyParts.length - 1];

        // Empty diffs - Decap CMS will fetch data via unpublishedEntryDataFile
        // Including data files in diffs causes Decap to treat them as media files
        return {
          collection: resolvedCollection,
          slug: resolvedSlug,
          status: unpub.status,
          diffs: [],
          updatedAt: unpub.updatedAt || new Date().toISOString(),
        };
      });
    }

    async unpublishedEntryDataFile(
      collection: string,
      slug: string,
      path: string,
      id: string,
    ): Promise<string> {
      const repo = this.getDocumentsRepo();
      // Normalize all possible key sources
      const key = normalizeKey(id || path || `${collection}/${slug}`);

      const result = await runTask(
        repo.getUnpublished(key),
        'Failed to get unpublished entry data',
      );

      return contentAsText(result.content);
    }

    async unpublishedEntryMediaFile(
      collection: string,
      slug: string,
      path: string,
      _id: string,
    ): Promise<ImplementationMediaFile & { file: File }> {
      // Media files for unpublished entries are stored in storage
      return this.getMediaFile(path);
    }

    async updateUnpublishedEntryStatus(
      collection: string,
      slug: string,
      newStatus: string,
    ): Promise<void> {
      const repo = this.getDocumentsRepo();
      const key = normalizeKey(`${collection}/${slug}`);

      await runTask(repo.updateUnpublished({ key, status: newStatus }), 'Failed to update status');
    }

    async deleteUnpublishedEntry(collection: string, slug: string): Promise<void> {
      const repo = this.getDocumentsRepo();
      const key = normalizeKey(`${collection}/${slug}`);

      await runTask(repo.deleteUnpublished(key), 'Failed to delete unpublished entry');
    }

    async publishUnpublishedEntry(collection: string, slug: string): Promise<void> {
      const repo = this.getDocumentsRepo();
      const key = normalizeKey(`${collection}/${slug}`);

      await runTask(repo.publish(key), 'Failed to publish entry');
    }

    // ===== CURSOR/PAGINATION =====

    async traverseCursor(cursor: Cursor, action: string): Promise<{
      entries: BackendEntry[],
      cursor: Cursor,
    }> {
      const folder = cursor.data?.['folder'] as string | undefined;

      if (!folder) {
        throw new NotFoundError('traverseCursor: cursor carries no folder, cannot advance pagination');
      }

      const currentPage = (cursor.meta?.['page'] as number | undefined) ?? 1;
      const pageCount = (cursor.meta?.['pageCount'] as number | undefined) ?? 1;

      let nextPage: number;
      switch (action) {
        case 'next':
          nextPage = currentPage + 1;
          break;
        case 'prev':
          nextPage = currentPage - 1;
          break;
        case 'first':
          nextPage = 1;
          break;
        case 'last':
          nextPage = pageCount;
          break;
        default:
          nextPage = 1;
      }

      // Use cached entries; fall back to a fresh fetch if the cache was cleared
      // (e.g. the backend instance was reused across a full page reload).
      const allEntries = this.allEntriesCache.get(folder) ?? await this._fetchAllEntriesFromRepo(folder);
      this.allEntriesCache.set(folder, allEntries);

      const { cursor: newCursor, pageEntries } = this._buildPageCursor(folder, allEntries, nextPage);
      return { entries: pageEntries, cursor: newCursor };
    }

    // ===== ADVISORY ENTRY LOCKING (ADR-007) =====
    //
    // Server-arbitrated, so two different browsers see the same lock. This is
    // the reason locking moved server-side at all: the bundled
    // `EntryLockManager` only ever shared locks between tabs of one browser.
    //
    // Degradation contract, matching what core does with each outcome:
    // - a **423** rejects, so core fetches the holder and raises the conflict
    //   banner. That is the one case the editor must be told about.
    // - **501** (this deployment's backend cannot lock) and transport failures
    //   resolve `null`/void, so locking silently degrades to "unsupported"
    //   rather than false-alarming a conflict or blocking the edit.

    private lockEndpoint(path: string): string {
      return `${this.apiUrl}/locks/${encodeURIComponent(path)}`;
    }

    private async lockRequest(
      path: string,
      init: { method: string, body?: unknown, suffix?: string },
    ): Promise<Response | null> {
      try {
        const token = await this.getToken();
        return await fetch(`${this.lockEndpoint(path)}${init.suffix ?? ''}`, {
          method: init.method,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        });
      } catch {
        // Offline, auth not resolved, CORS: all "cannot arbitrate right now".
        return null;
      }
    }

    /** Map the wire lock shape onto the editor's `CmsEntryLock`. */
    private toCmsLock(data: LockResponseData): CmsEntryLock {
      return {
        path: data.key,
        owner: { id: data.owner.id, name: data.owner.name },
        acquiredAt: data.acquiredAt,
        expiresAt: data.expiresAt,
      };
    }

    private async readLockBody(res: Response): Promise<{ data?: LockResponseData | null } | null> {
      try {
        return await res.json() as { data?: LockResponseData | null };
      } catch {
        return null;
      }
    }

    async getEntryLock(path: string): Promise<CmsEntryLock | null> {
      const res = await this.lockRequest(path, { method: 'GET' });
      if (!res || !res.ok) return null;
      const body = await this.readLockBody(res);
      return body?.data ? this.toCmsLock(body.data) : null;
    }

    async acquireEntryLock(
      path: string,
      _owner: CmsEntryLockOwner,
      opts?: { force?: boolean },
    ): Promise<CmsEntryLock | null> {
      // `owner` is intentionally unused: the server derives the lock owner from
      // the authenticated principal, so a client cannot lock as someone else.
      const res = await this.lockRequest(path, {
        method: 'POST',
        body: { force: opts?.force ?? false },
      });
      if (!res) return null;
      if (res.status === 423) {
        throw new APIError('Entry is locked by another user', 423, 'Laika Backend');
      }
      if (!res.ok) return null;

      const body = await this.readLockBody(res);
      if (!body?.data) return null;
      if (body.data.token) this.entryLockTokens.set(path, body.data.token);
      return this.toCmsLock(body.data);
    }

    async refreshEntryLock(path: string, owner: CmsEntryLockOwner): Promise<CmsEntryLock | null> {
      const token = this.entryLockTokens.get(path);
      // No token means this session never acquired the lock (a reload, say).
      // Re-acquiring is the honest recovery: it succeeds if the entry is free
      // or already ours, and conflicts if somebody else took it meanwhile.
      if (!token) return this.acquireEntryLock(path, owner);

      const res = await this.lockRequest(path, { method: 'POST', suffix: '/refresh', body: { token } });
      if (!res) return null;
      if (res.status === 423) {
        this.entryLockTokens.delete(path);
        throw new APIError('Entry lock was taken by another user', 423, 'Laika Backend');
      }
      if (!res.ok) return null;

      const body = await this.readLockBody(res);
      if (!body?.data) return null;
      if (body.data.token) this.entryLockTokens.set(path, body.data.token);
      return this.toCmsLock(body.data);
    }

    async releaseEntryLock(path: string, _owner: CmsEntryLockOwner): Promise<void> {
      const token = this.entryLockTokens.get(path);
      // Nothing to release, and without a token the server would refuse anyway.
      if (!token) return;
      this.entryLockTokens.delete(path);
      // Best effort: the server only evicts a lock we still hold, and a failed
      // release just lets the lock lapse via its TTL.
      await this.lockRequest(path, { method: 'DELETE', body: { token } });
    }

    // ===== DEPLOY PREVIEW =====

    async getDeployPreview(_collection: string, _slug: string): Promise<{ url: string, status: string } | null> {
      // Deploy preview is not supported in this implementation
      return null;
    }
  };
}
