import type { CmsAuthScope } from "./common";

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
  api_root?: string;
  site_domain?: string;
  base_url?: string;
  auth_endpoint?: string;
  cms_label_prefix?: string;
  squash_merges?: boolean;
  proxy_url?: string;
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
