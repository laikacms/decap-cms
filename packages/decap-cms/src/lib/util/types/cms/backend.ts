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
  | 'local-fs';

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
