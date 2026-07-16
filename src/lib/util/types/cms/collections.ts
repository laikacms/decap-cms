import type {
  CmsCollectionFormatType,
  CmsFilterRule,
  CmsSortableField,
  CmsViewFilter,
  CmsViewGroup,
} from './common.js';
import type { CmsField } from './field.js';
import type { CmsI18nConfig } from './i18n.js';
import type { CmsEntryFields } from './entries.js';

export interface CmsCollectionFile {
  name: string;
  label: string;
  file: string;
  fields: CmsField[];
  label_singular?: string;
  description?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  preview_path_preserve_slashes?: boolean;
  i18n?: boolean | CmsI18nConfig;
  media_folder?: string;
  public_folder?: string;
}

export interface CmsCollection {
  name: string;
  label: string;
  label_singular?: string | undefined;
  description?: string | undefined;
  folder?: string | undefined;
  files?: CmsCollectionFile[] | undefined;
  type?: 'folder_based_collection' | 'file_based_collection' | undefined;
  identifier_field?: string | undefined;
  summary?: string | undefined;
  slug?: string | undefined;
  preview_path?: string | undefined;
  preview_path_date_field?: string | undefined;
  preview_path_preserve_slashes?: boolean | undefined;
  create?: boolean | undefined;
  delete?: boolean | undefined;
  hide?: boolean | undefined;
  editor?:
    | {
        preview?: boolean | undefined;
        /**
         * Enables steganographic Visual Editing for this collection's preview pane.
         * When `true`, `string`, `text`, and `markdown` field values rendered in the
         * live preview are encoded (via `@vercel/stega`) so a frontend can map
         * on-page text back to its source field. Only affects the in-memory preview
         * entry — saved entry data is never modified. Individual fields can opt out
         * with `visualEditing: false`. Defaults to `false` (disabled).
         */
        visualEditing?: boolean | undefined;
      }
    | undefined;
  publish?: boolean | undefined;
  nested?:
    | {
        depth: number | undefined;
        subfolders?: boolean | undefined;
      }
    | undefined;
  meta?: { path?: { label: string; widget: string; index_file: string } } | undefined;
  extension?: string | undefined;
  format?: CmsCollectionFormatType | undefined;
  frontmatter_delimiter?: string[] | string | undefined;
  fields?: CmsField[] | undefined;
  filter?: { field: string; value: unknown } | undefined;
  path?: string | undefined;
  media_folder?: string | undefined;
  public_folder?: string | undefined;
  sortable_fields?: (string | CmsSortableField)[] | undefined;
  view_filters?: CmsViewFilter[] | undefined;
  view_groups?: CmsViewGroup[] | undefined;
  i18n?: boolean | CmsI18nConfig | undefined;
  /** @deprecated Use sortable_fields instead */
  sortableFields?: (string | CmsSortableField)[] | undefined;
}

// Normalized internal collection type (after config loading)
export type CmsCollectionFileState = {
  file: string;
  name: string;
  fields: CmsEntryFields;
  label: string;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  preview_path_preserve_slashes?: boolean;
};

export type CmsPathObject = { label: string; widget: string; index_file: string };

export type CmsMetaObject = { path?: CmsPathObject };

export type CmsI18nStructure = {
  structure: string;
  locales: string[];
  default_locale: string;
};

export type CmsCollectionState = {
  name: string;
  folder?: string;
  files?: CmsCollectionFileState[];
  fields: CmsEntryFields;
  isFetching: boolean;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  preview_path_preserve_slashes?: boolean;
  summary?: string;
  description?: string;
  filter?: CmsFilterRule;
  type: 'file_based_collection' | 'folder_based_collection';
  extension?: string;
  format?: CmsCollectionFormatType | string;
  frontmatter_delimiter?: string[] | string | [string, string];
  create?: boolean;
  delete?: boolean;
  identifier_field?: string;
  path?: string;
  slug?: string;
  label_singular?: string;
  label: string;
  sortable_fields: CmsSortableField[];
  view_filters: CmsViewFilter[];
  view_groups: CmsViewGroup[];
  nested?: { depth: number; subfolders?: boolean };
  meta?: CmsMetaObject;
  i18n: CmsI18nStructure;
  hide?: boolean;
  [key: string]: unknown;
};

export type CmsCollections = Record<string, CmsCollectionState>;
