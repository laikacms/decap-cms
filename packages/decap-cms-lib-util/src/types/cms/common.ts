
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

export type CmsPage = { isFetching: boolean; page: number; ids: string[] };

export type CmsPages = Record<string, CmsPage>;

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

export interface CmsFilterObj {
  field: string;
  values: unknown[];
}

export type CmsAllowedEvent =
  'prePublish' |
  'postPublish' |
  'preUnpublish' |
  'postUnpublish' |
  'preSave' |
  'postSave';


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

export type CmsEventListenerOptions = unknown; // TODO: type properly

export type CmsLocalePhrases = unknown; // TODO: type properly

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
    /**
     * Used if widget === "list" to create a flat array
     */
    field?: CmsEditorComponentField;
    /**
     * Used if widget === "list" to create an array of objects
     */
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
  toPreview: (data: unknown, getAsset: (value: string, field?: unknown) => string, fields?: unknown[]) => string | unknown /* JSX */;
}

export interface CmsEditorComponentPlugin extends Omit<CmsEditorComponentOptions, 'fields'> {
  type?: 'code-block' | 'shortcode';
  icon?: string;
  widget?: string;
  fields: CmsEditorComponentField[];
}

export type CmsDisplayURLObject = { id: string; path: string }

export type CmsDisplayURL = CmsDisplayURLObject| string;

export interface CmsSortableField {
  field: string;
  label?: string;
  default_sort?: boolean | 'asc' | 'desc';
}
