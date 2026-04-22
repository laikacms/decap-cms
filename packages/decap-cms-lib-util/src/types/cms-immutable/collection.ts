import type { List } from "immutable";
import type { StaticallyTypedRecord } from "../immutable";
import type { EntryFields } from "./entries";
import type { FormatExtensions } from "../core";
import type { FilterRule, SortableField, ViewFilter, ViewGroup } from "./common";

export type CollectionFile = StaticallyTypedRecord<{
  file: string;
  name: string;
  fields: EntryFields;
  label: string;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  preview_path_date_field?: string;
}>;

export type CollectionFiles = List<CollectionFile>;

export type NestedObject = { depth: number; subfolders?: boolean };

export type Nested = StaticallyTypedRecord<NestedObject>;

export type PathObject = { label: string; widget: string; index_file: string };

export type MetaObject = {
  path?: StaticallyTypedRecord<PathObject>;
};

export type Meta = StaticallyTypedRecord<MetaObject>;

export type i18n = StaticallyTypedRecord<{
  structure: string;
  locales: string[];
  default_locale: string;
}>;


export type Format = keyof FormatExtensions | string;

export type CollectionObject = {
  name: string;
  folder?: string;
  files?: CollectionFiles;
  fields: EntryFields;
  isFetching: boolean;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  summary?: string;
  description?: string;
  filter?: FilterRule;
  type: 'file_based_collection' | 'folder_based_collection';
  extension?: string;
  format?: Format;
  frontmatter_delimiter?: List<string> | string | [string, string];
  create?: boolean;
  delete?: boolean;
  identifier_field?: string;
  path?: string;
  slug?: string;
  label_singular?: string;
  label: string;
  sortable_fields: List<StaticallyTypedRecord<SortableField>>;
  view_filters: List<StaticallyTypedRecord<ViewFilter>>;
  view_groups: List<StaticallyTypedRecord<ViewGroup>>;
  nested?: Nested;
  meta?: Meta;
  i18n: i18n;
  hide?: boolean;
};

export type Collection = StaticallyTypedRecord<CollectionObject>;

export type Collections = StaticallyTypedRecord<{ [path: string]: Collection & CollectionObject }>;
