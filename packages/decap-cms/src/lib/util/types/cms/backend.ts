import type { BackendImplementation } from '@/lib/backend/implementation';
import type { CmsConfig } from './cms.js';
import type { CmsAuthScope } from './common.js';

export type CmsBackendType =
  | 'azure'
  | 'git-gateway'
  | 'github'
  | 'gitlab'
  | 'gitea'
  | 'forgejo'
  | 'bitbucket'
  | 'test-repo'
  | 'proxy'
  | 'local-fs'
  | 'turbo-github'
  | 'turbo-gitlab';

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
  /**
   * Offers a "log in with a personal access token" form alongside the
   * backend's normal OAuth button (DCMS-1400). Opt-in: useful for local
   * dev, self-hosted GitLab/Gitea/Forgejo, and CI-less setups where
   * standing up an OAuth app or auth proxy is overkill. The pasted token
   * is used exactly like an OAuth-obtained token — no separate code path
   * in the backend implementations.
   */
  pat_auth?: boolean;
  large_media_url?: string;
  use_large_media_transforms_in_media_library?: boolean;
  identity_url?: string;
  gateway_url?: string;
  status_endpoint?: string;
  graphql_api_root?: string;
  /** Decap Turbo: the site's id in Turbo; the rest of its backend config is fetched from the control plane. */
  turbo_site_id?: string;
  /** Decap Turbo: where `preloadConfig` fetches the site's defaults from. */
  turbo_config_url?: string;
  /** Decap Turbo: the Turbo dashboard the login popup and links point at. */
  turbo_admin_url?: string;
  /** Decap Turbo: the Supabase project ref. Set with `supabase_anon_key` to configure without the control plane. */
  supabase_app_id?: string;
  supabase_anon_key?: string;
  /**
   * Decap Turbo, experimental: set true to turn on the editor bridge (AI
   * agents setting fields in the open entry). Off by default.
   */
  editor_bridge?: boolean;
  /**
   * Decap Turbo: deploy status (the "your change is live" notifications and
   * the Deploys page). On by default; `false` turns it off, an object turns
   * parts off or names the host whose success counts as live.
   */
  deploy_status?:
    | boolean
    | { enabled?: boolean, notifications?: boolean, page?: boolean, primary_target?: string };
  /** Decap Turbo: the commit author email when the signed-in editor has none. */
  commit_author_email?: string;
  /** Decap Turbo: older spelling of `commit_author_email`. */
  noreply_email?: string;
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

export interface CmsRegistryBackend {
  init: (config: CmsConfig, opts?: Record<string, unknown>) => BackendImplementation;
  /**
   * The registered class itself, so core can reach its static hooks (e.g.
   * `preloadConfig`) before an instance exists.
   */
  BackendClass?: unknown;
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
    turbo_site_id?: string,
    turbo_config_url?: string,
    turbo_admin_url?: string,
    supabase_app_id?: string,
    supabase_anon_key?: string,
    editor_bridge?: boolean,
    deploy_status?: boolean | { enabled?: boolean, notifications?: boolean, page?: boolean, primary_target?: string },
    commit_author_email?: string,
    noreply_email?: string,
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
