import type {
  CmsAuthScope,
  CmsCredentials,
  CmsUser,
  CmsAssetProxy,
  CmsDataFile,
  CmsPersistOptions,
  CmsDeleteOptions,
  CmsDisplayURL,
} from './common.js';
import type {
  CmsFileEntry,
  CmsImplementationEntry,
  CmsImplementationFile,
  CmsUnpublishedEntry,
} from './entries.js';
import type { CmsImplementationMediaFile } from './media.js';
import type Cursor from '@/lib/util/Cursor.js';

export type CmsBackendType =
  | 'azure'
  | 'git-gateway'
  | 'github'
  | 'gitlab'
  | 'gitea'
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
    create?: string;
    update?: string;
    delete?: string;
    uploadMedia?: string;
    deleteMedia?: string;
    openAuthoring?: string;
  };
}

export interface CmsLocalBackend {
  url?: string;
  allowed_hosts?: string[];
}

export type CmsBackendClass = unknown; // TODO: type properly

export interface CmsRegistryBackend {
  init: (args: unknown) => CmsBackendClass;
}

export type CmsBackendObject = {
  name: string;
  repo?: string | null;
  open_authoring?: boolean;
  branch?: string;
  api_root?: string;
  squash_merges?: boolean;
  signoff_commits?: boolean;
  use_graphql?: boolean;
  preview_context?: string;
  identity_url?: string;
  gateway_url?: string;
  large_media_url?: string;
  use_large_media_transforms_in_media_library?: boolean;
  commit_messages: Record<string, string>;
};

export type CmsBackendState = CmsBackendObject;

export type CmsBackendInitConfig = {
  backend: {
    repo?: string | null;
    open_authoring?: boolean;
    always_fork?: boolean;
    branch?: string;
    api_root?: string;
    squash_merges?: boolean;
    signoff_commits?: boolean;
    use_graphql?: boolean;
    graphql_api_root?: string;
    preview_context?: string;
    identity_url?: string;
    gateway_url?: string;
    large_media_url?: string;
    use_large_media_transforms_in_media_library?: boolean;
    proxy_url?: string;
    auth_type?: string;
    app_id?: string;
    base_url?: string;
    cms_label_prefix?: string;
    api_version?: string;
    status_endpoint?: string;
  };
  auth?: {
    use_oidc?: boolean;
    base_url?: string;
    auth_endpoint?: string;
    auth_token_endpoint?: string;
    app_id?: string;
    auth_token_endpoint_content_type?: string;
    email_claim?: string;
    full_name_claim?: string;
    first_name_claim?: string;
    last_name_claim?: string;
    avatar_url_claim?: string;
  };
  media_folder?: string;
  base_url?: string;
  site_id?: string;
};

export interface CmsImplementation {
  authComponent: () => void;
  restoreUser: (user: CmsUser) => Promise<CmsUser>;

  authenticate: (credentials: CmsCredentials) => Promise<CmsUser>;
  logout: () => Promise<void> | void | null;
  getToken: () => Promise<string | null>;

  getEntry: (path: string) => Promise<CmsImplementationEntry>;
  entriesByFolder: (
    folder: string,
    extension: string,
    depth: number,
  ) => Promise<CmsImplementationEntry[]>;
  entriesByFiles: (files: CmsImplementationFile[]) => Promise<CmsImplementationEntry[]>;

  getMediaDisplayURL?: (displayURL: CmsDisplayURL) => Promise<string>;
  getMedia: (folder?: string) => Promise<CmsImplementationMediaFile[]>;
  getMediaFile: (path: string) => Promise<CmsImplementationMediaFile>;

  persistEntry: (entry: CmsFileEntry, opts: CmsPersistOptions) => Promise<void>;
  persistMedia: (
    file: CmsAssetProxy,
    opts: CmsPersistOptions,
  ) => Promise<CmsImplementationMediaFile>;
  deleteFiles: (paths: string[], commitMessage: string) => Promise<void>;

  unpublishedEntries: () => Promise<string[]>;
  unpublishedEntry: (args: {
    id?: string;
    collection?: string;
    slug?: string;
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
  ) => Promise<{ url: string; status: string } | null>;

  allEntriesByFolder?: (
    folder: string,
    extension: string,
    depth: number,
    pathRegex?: RegExp,
  ) => Promise<CmsImplementationEntry[]>;
  traverseCursor?: (
    cursor: Cursor,
    action: string,
  ) => Promise<{ entries: CmsImplementationEntry[]; cursor: Cursor }>;

  isGitBackend?: () => boolean;
  status: () => Promise<{
    auth: { status: boolean };
    api: { status: boolean; statusPage: string };
  }>;
}
