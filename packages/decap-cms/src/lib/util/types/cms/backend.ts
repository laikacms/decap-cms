import type Cursor from '@/lib/util/Cursor.js';
import type { CmsConfig } from './cms.js';
import type {
  CmsAssetProxy,
  CmsAuthScope,
  CmsCredentials,
  CmsDataFile,
  CmsDeleteOptions,
  CmsDisplayURL,
  CmsPersistOptions,
  CmsUser,
} from './common.js';
import type { CmsFileEntry, CmsImplementationEntry, CmsImplementationFile, CmsUnpublishedEntry } from './entries.js';
import type {
  CmsGetMediaPageOptions,
  CmsImplementationMediaFile,
  CmsMediaCapabilities,
  CmsMediaPage,
} from './media.js';

export type CmsBackendType =
  | 'azure'
  | 'git-gateway'
  | 'github'
  | 'gitlab'
  | 'gitea'
  | 'forgejo'
  | 'bitbucket'
  | 'test-repo'
  | 'proxy';

export interface CmsBackend {
  name: CmsBackendType;
  auth_scope?: CmsAuthScope;
  open_authoring?: boolean;
  repo?: string;
  branch?: string;
  always_fork?: boolean;
  api_root?: string;
  site_domain?: string;
  base_url?: string;
  app_id?: string;
  auth_token_endpoint?: string;
  auth_endpoint?: string;
  cms_label_prefix?: string;
  use_graphql?: boolean;
  squash_merges?: boolean;
  signoff_commits?: boolean;
  preview_context?: string;
  api_version?: string;
  proxy_url?: string;
  auth_type?: string;
  large_media_url?: string;
  use_large_media_transforms_in_media_library?: boolean;
  identity_url?: string;
  gateway_url?: string;
  status_endpoint?: string;
  graphql_api_root?: string;
  commit_messages?: {
    create?: string,
    update?: string,
    delete?: string,
    uploadMedia?: string,
    deleteMedia?: string,
    openAuthoring?: string,
  };
}

export interface CmsLocalBackend {
  url?: string;
  allowed_hosts?: string[];
}

/**
 * The user identity an entry lock is held (or requested) under. `id` should
 * be a stable per-user identifier (e.g. login/email) so a lock survives a
 * display-name change and so the acquiring tab can recognize a lock as its
 * own on refresh/reconnect.
 */
export type CmsEntryLockOwner = {
  id: string,
  name: string,
};

/**
 * An advisory lock on a single entry path. Locks are cooperative — nothing
 * stops a backend/storage layer from accepting a write from a non-holder —
 * they exist purely to surface "someone else has this open" in the UI and
 * let the CMS warn/block before a save silently clobbers a concurrent edit.
 *
 * `expiresAt` implements stale-lock expiry: a lock past its expiry is
 * treated as free (auto-released) without requiring the original holder's
 * tab to still be around to release it explicitly (crashed tab, closed
 * laptop, lost network, etc).
 */
export type CmsEntryLock = {
  path: string,
  owner: CmsEntryLockOwner,
  acquiredAt: string,
  expiresAt: string,
};

/**
 * The constructor `registerBackend(name, BackendClass)` expects: instantiated
 * by core with the resolved config and any extra options, producing the
 * `CmsImplementation` the backend registry wraps.
 */
export type CmsBackendClass = new(
  config: CmsConfig,
  opts?: Record<string, unknown>,
) => CmsImplementation;

export interface CmsRegistryBackend {
  init: (args: unknown) => CmsBackendClass;
}

export type CmsBackendObject = {
  name: string,
  repo?: string | null,
  open_authoring?: boolean,
  branch?: string,
  api_root?: string,
  squash_merges?: boolean,
  signoff_commits?: boolean,
  use_graphql?: boolean,
  preview_context?: string,
  identity_url?: string,
  gateway_url?: string,
  large_media_url?: string,
  use_large_media_transforms_in_media_library?: boolean,
  commit_messages: Record<string, string>,
};

export type CmsBackendState = CmsBackendObject;

export type CmsBackendInitConfig = {
  backend: {
    repo?: string | null,
    open_authoring?: boolean,
    always_fork?: boolean,
    branch?: string,
    api_root?: string,
    squash_merges?: boolean,
    signoff_commits?: boolean,
    use_graphql?: boolean,
    graphql_api_root?: string,
    preview_context?: string,
    identity_url?: string,
    gateway_url?: string,
    large_media_url?: string,
    use_large_media_transforms_in_media_library?: boolean,
    proxy_url?: string,
    auth_type?: string,
    app_id?: string,
    base_url?: string,
    auth_endpoint?: string,
    cms_label_prefix?: string,
    api_version?: string,
    status_endpoint?: string,
  },
  auth?: {
    use_oidc?: boolean,
    base_url?: string,
    auth_endpoint?: string,
    auth_token_endpoint?: string,
    app_id?: string,
    auth_token_endpoint_content_type?: string,
    email_claim?: string,
    full_name_claim?: string,
    first_name_claim?: string,
    last_name_claim?: string,
    avatar_url_claim?: string,
  },
  media_folder?: string,
  base_url?: string,
  site_id?: string,
};

export interface CmsImplementation {
  authComponent: () => void;
  restoreUser: (user: CmsUser) => Promise<CmsUser>;

  authenticate: (credentials: CmsCredentials) => Promise<CmsUser>;
  logout: () => Promise<void> | void | null;
  getToken: () => Promise<string | null>;

  /**
   * Proactively refresh credentials so they are valid *now* (optional).
   * Called by the app when the user plausibly returns from being away (tab
   * becomes visible, network comes back online, periodic check) so that the
   * next user action doesn't run into an expired token. Implementations
   * should resolve without a network call when the current credentials are
   * still fresh, and report an unrecoverably dead session through
   * `onSessionExpired` rather than by rejecting.
   */
  ensureFreshSession?: () => Promise<void>;

  /**
   * `useWorkflow` is an optional hint for implementations that probe both
   * published and unpublished storage: when `false`, the caller knows the
   * collection has no editorial workflow, so an unpublished-only lookup can
   * be skipped. Implementations that don't distinguish published/unpublished
   * storage may ignore it.
   */
  getEntry: (path: string, useWorkflow?: boolean) => Promise<CmsImplementationEntry>;
  entriesByFolder: (
    folder: string,
    extension: string,
    depth: number,
  ) => Promise<CmsImplementationEntry[]>;
  entriesByFiles: (files: CmsImplementationFile[]) => Promise<CmsImplementationEntry[]>;

  getMediaDisplayURL?: (displayURL: CmsDisplayURL) => Promise<string>;
  /**
   * `folderSupport` asks the backend to also return directory entries
   * (`isDirectory: true`) alongside files, when it's able to do so from the
   * same listing call it would make anyway (github, gitlab, gitea, forgejo,
   * bitbucket, azure, proxy and laika all do this). Backends that can't
   * populate directories cheaply may ignore the flag and return files only;
   * callers must not assume directories are present.
   */
  getMedia: (folder?: string, folderSupport?: boolean) => Promise<CmsImplementationMediaFile[]>;
  getMediaFile: (path: string) => Promise<CmsImplementationMediaFile>;

  /**
   * Paginated media surface (optional). Backends that implement both methods
   * let the media library load pages on demand (infinite scroll) instead of
   * calling `getMedia()` for the entire library up front. `getMedia` stays
   * required — the per-entry media-folder path and older callers still use it.
   */
  getMediaCapabilities?: () => Promise<CmsMediaCapabilities>;
  /**
   * Fetch one page of media. `cursor` is the opaque continuation returned by
   * the previous page (omit for the first page). `query` is only passed when
   * `getMediaCapabilities().dynamicSearch` is true; the backend applies it
   * server-side. A missing `nextCursor` on the result means the listing is
   * exhausted.
   */
  getMediaPage?: (opts: CmsGetMediaPageOptions) => Promise<CmsMediaPage>;

  persistEntry: (entry: CmsFileEntry, opts: CmsPersistOptions) => Promise<void>;
  persistMedia: (
    file: CmsAssetProxy,
    opts: CmsPersistOptions,
  ) => Promise<CmsImplementationMediaFile>;
  deleteFiles: (paths: string[], commitMessage: string) => Promise<void>;

  unpublishedEntries: () => Promise<string[]>;
  unpublishedEntry: (args: {
    id?: string,
    collection?: string,
    slug?: string,
  }) => Promise<CmsUnpublishedEntry>;
  unpublishedEntryDataFile: (
    collection: string,
    slug: string,
    path: string,
    id: string,
  ) => Promise<string>;
  unpublishedEntryMediaFile: (
    collection: string,
    slug: string,
    path: string,
    id: string,
  ) => Promise<CmsImplementationMediaFile>;
  updateUnpublishedEntryStatus: (
    collection: string,
    slug: string,
    newStatus: string,
  ) => Promise<void>;
  publishUnpublishedEntry: (collection: string, slug: string) => Promise<void>;
  deleteUnpublishedEntry: (collection: string, slug: string) => Promise<void>;
  getDeployPreview: (
    collectionName: string,
    slug: string,
  ) => Promise<{ url: string, status: string } | null>;

  allEntriesByFolder?: (
    folder: string,
    extension: string,
    depth: number,
    pathRegex?: RegExp,
  ) => Promise<CmsImplementationEntry[]>;
  traverseCursor?: (
    cursor: Cursor,
    action: string,
  ) => Promise<{ entries: CmsImplementationEntry[], cursor: Cursor }>;

  isGitBackend?: () => boolean;
  status: () => Promise<{
    auth: { status: boolean },
    api: { status: boolean, statusPage: string },
  }>;

  /**
   * Content-sync surface (optional). A sync token is an opaque string that changes
   * whenever any content changes (git: branch head sha; database: sequence number).
   * Backends that support it enable background change detection without content reads.
   */
  getSyncToken?: () => Promise<string | null>;
  /**
   * Lists content changes since a previously returned sync token, as repo-relative
   * paths, plus the token to poll from next. Optional even when getSyncToken exists;
   * without it a token change invalidates coarsely instead of per path.
   */
  getChanges?: (
    since: string,
  ) => Promise<{ changes: { path: string, deleted: boolean }[], token: string } | null>;

  /**
   * Advisory entry locking (optional capability). A backend declares support
   * by implementing all four methods below (core feature-detects via
   * `acquireEntryLock`) — see `src/lib/util/entryLockManager.ts` for a
   * reusable local/in-memory reference implementation any backend can
   * delegate to (used by the `test-repo` backend), and `LaikaBackend`'s
   * README for the follow-up needed to arbitrate locks server-side.
   *
   * Locks are advisory only: nothing here blocks a write, it only informs
   * the UI so it can warn the user before they clobber a concurrent edit.
   */
  getEntryLock?: (path: string) => Promise<CmsEntryLock | null>;
  /**
   * Acquire (or renew) the lock for `path` under `owner`. Succeeds and
   * returns the caller's own lock when the path is unlocked, already held by
   * `owner`, or `opts.force` is set (an explicit user override of someone
   * else's lock). Rejects when held by a different, non-expired owner and
   * `opts.force` is not set.
   */
  acquireEntryLock?: (
    path: string,
    owner: CmsEntryLockOwner,
    opts?: { force?: boolean },
  ) => Promise<CmsEntryLock>;
  /**
   * Release the lock for `path`, but only if currently held by `owner` — a
   * release from a stale tab that lost a force-override race must not evict
   * the new holder.
   */
  releaseEntryLock?: (path: string, owner: CmsEntryLockOwner) => Promise<void>;
  /**
   * Extend the lock's TTL. Called periodically by the editor while an entry
   * stays open, so a long editing session doesn't go stale mid-edit.
   */
  refreshEntryLock?: (path: string, owner: CmsEntryLockOwner) => Promise<CmsEntryLock>;
}
