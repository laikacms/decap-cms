export type CmsCollectionFormatType =
  | 'yml'
  | 'yaml'
  | 'toml'
  | 'json'
  | 'frontmatter'
  | 'yaml-frontmatter'
  | 'toml-frontmatter'
  | 'json-frontmatter';

export type CmsAuthScope = 'repo' | 'public_repo';

export type CmsPublishMode = 'simple' | 'editorial_workflow';

export type CmsSlugEncoding = 'unicode' | 'ascii';

export interface CmsSlug {
  encoding?: CmsSlugEncoding;
  clean_accents?: boolean;
  sanitize_replacement?: string;
}

export enum CmsSortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
  None = 'None',
}

export type CmsSortObject = { key: string; direction: CmsSortDirection };

export interface CmsViewGroup {
  label: string;
  field: string;
  pattern: string;
  id: string;
}

export interface CmsViewFilter {
  label: string;
  field: string;
  pattern: string;
  id: string;
}

export type CmsFilterRule = {
  value: string;
  field: string;
};

export interface CmsFilterObj {
  field: string;
  values: unknown[];
}

export type CmsAllowedEvent =
  | 'prePublish'
  | 'postPublish'
  | 'preUnpublish'
  | 'postUnpublish'
  | 'preSave'
  | 'postSave';

export interface CmsEventListener {
  name: CmsAllowedEvent;
  handler: ({
    entry,
    author,
  }: {
    entry: Record<string, unknown>;
    author: { login: string; name: string };
  }) => unknown;
}

export type CmsEventListenerOptions = Record<string, unknown>;

/**
 * A locale's translation strings, keyed by (nested) namespace. Locale packs
 * (see `src/locales/*`) are plain nested objects of strings; `registerLocale`
 * and `getLocale` pass this shape through as-is.
 */
export type CmsLocalePhrases = { [key: string]: string | CmsLocalePhrases };

export type CmsFormatterFunctions = {
  fromFile(content: string): unknown;
  toFile(data: object, sortedKeys?: string[], comments?: Record<string, string>): string;
};

export type CmsFormatter = {
  extension: string;
  formatter: CmsFormatterFunctions;
};

export interface CmsEventHandler {
  handler: (...args: unknown[]) => unknown;
  options: Record<string, unknown>;
}

export type CmsEditorComponentField =
  | {
      name: string;
      label: string;
      widget?: string;
      [key: string]: unknown;
    }
  | {
      widget: 'list';
      field?: CmsEditorComponentField;
      fields?: CmsEditorComponentField[];
    };

export interface CmsEditorComponentOptions {
  id: string;
  label: string;
  fields?: CmsEditorComponentField[];
  pattern: RegExp;
  allow_add?: boolean;
  fromBlock: (match: RegExpMatchArray) => unknown;
  toBlock: (data: unknown) => string;
  toPreview: (
    data: unknown,
    getAsset: (value: string, field?: unknown) => string,
    fields?: unknown[],
  ) => string | unknown;
}

export interface CmsEditorComponentPlugin extends Omit<CmsEditorComponentOptions, 'fields'> {
  type?: 'code-block' | 'shortcode';
  icon?: string;
  widget?: string;
  fields: CmsEditorComponentField[];
}

export type CmsDisplayURLObject = { id: string; path: string };

export type CmsDisplayURL = CmsDisplayURLObject | string;

export interface CmsSortableField {
  field: string;
  label?: string;
  default_sort?: boolean | 'asc' | 'desc';
}

export type CmsCredentials = { token: string | Record<string, unknown>; refresh_token?: string };

export type CmsUser = CmsCredentials & {
  backendName?: string;
  login?: string;
  email?: string;
  name: string;
  useOpenAuthoring?: boolean;
};

export type CmsAssetProxy = {
  path: string;
  url?: string;
  fileObj?: File;
  toBase64: () => Promise<string>;
  sha?: string | null; // For git-based backends
};

export type CmsDataFile = {
  path: string;
  slug: string;
  raw: string;
  newPath?: string;
  sha?: string | null; // For git-based backends
};

export type CmsPersistOptions = {
  newEntry?: boolean;
  commitMessage: string;
  collectionName?: string;
  useWorkflow?: boolean;
  unpublished?: boolean;
  status?: string;
};

export type CmsDeleteOptions = Record<string, unknown>;

export type CmsGetAssetFunction = (asset: string) => {
  url: string;
  path: string;
  field?: unknown;
  fileObj: File;
};
