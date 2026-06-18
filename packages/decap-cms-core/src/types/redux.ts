import type { Action } from 'redux';
import type { FILES, FOLDER } from '../constants/collectionTypes';
import type { MediaFile as BackendMediaFile } from '../backend';
import type { Auth } from '../reducers/auth';
import type { Status } from '../reducers/status';
import type { Medias } from '../reducers/medias';
import type { Deploys } from '../reducers/deploys';
import type { Search } from '../reducers/search';
import type { GlobalUI } from '../reducers/globalUI';
import type { NotificationsState } from '../reducers/notifications';
import type { formatExtensions } from '../formats/formats';

export type CmsBackendType =
  | 'azure'
  | 'git-gateway'
  | 'github'
  | 'gitlab'
  | 'gitea'
  | 'bitbucket'
  | 'test-repo'
  | 'proxy';

export type CmsMapWidgetType = 'Point' | 'LineString' | 'Polygon';

export type CmsMarkdownWidgetButton =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'heading-one'
  | 'heading-two'
  | 'heading-three'
  | 'heading-four'
  | 'heading-five'
  | 'heading-six'
  | 'quote'
  | 'bulleted-list'
  | 'numbered-list';

export interface CmsSelectWidgetOptionObject {
  label: string;
  value: unknown;
}

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

export interface CmsI18nConfig {
  structure: 'multiple_folders' | 'multiple_files' | 'single_file';
  locales: string[];
  default_locale?: string;
}

export interface CmsFieldBase {
  name: string;
  label?: string;
  required?: boolean;
  hint?: string;
  pattern?: [string, string];
  i18n?: boolean | 'translate' | 'duplicate' | 'none';
  media_folder?: string;
  public_folder?: string;
  comment?: string;
  visualEditing?: boolean;
}

export interface CmsFieldBoolean {
  widget: 'boolean';
  default?: boolean;
}

export interface CmsFieldCode {
  widget: 'code';
  default?: unknown;

  default_language?: string;
  allow_language_selection?: boolean;
  keys?: { code: string; lang: string };
  output_code_only?: boolean;
}

export interface CmsFieldColor {
  widget: 'color';
  default?: string;

  allow_input?: boolean;
  enable_alpha?: boolean;

  /**
   * @deprecated Use allow_input instead
   */
  allowInput?: boolean;
  /**
   * @deprecated Use enable_alpha instead
   */
  enableAlpha?: boolean;
}

export interface CmsFieldDateTime {
  widget: 'datetime';
  default?: string;

  format?: string;
  date_format?: boolean | string;
  time_format?: boolean | string;
  picker_utc?: boolean;

  /**
   * @deprecated Use date_format instead
   */
  dateFormat?: boolean | string;
  /**
   * @deprecated Use time_format instead
   */
  timeFormat?: boolean | string;
  /**
   * @deprecated Use picker_utc instead
   */
  pickerUtc?: boolean;
}

export interface CmsFieldFileOrImage {
  widget: 'file' | 'image';
  default?: string;

  /** Use `media_library.config` to pass options to the media library for this field. */
  media_library?: CmsMediaLibrary & { allow_multiple?: boolean };
  class?: string;
  choose_url?: boolean;
  private?: boolean;
}

export interface CmsFieldObject {
  widget: 'object';
  default?: unknown;

  collapsed?: boolean;
  summary?: string;
  fields: CmsField[];
}

export interface CmsFieldList {
  widget: 'list';
  default?: unknown;

  allow_add?: boolean;
  allow_remove?: boolean;
  allow_reorder?: boolean;
  collapsed?: boolean;
  summary?: string;
  minimize_collapsed?: boolean;
  label_singular?: string;
  field?: CmsField;
  fields?: CmsField[];
  max?: number;
  min?: number;
  add_to_top?: boolean;
  types?: (CmsFieldBase & CmsFieldObject)[];
  typeKey?: string;
}

export interface CmsFieldMap {
  widget: 'map';
  default?: string;

  decimals?: number;
  type?: CmsMapWidgetType;
}

export interface CmsFieldMarkdown {
  widget: 'markdown';
  default?: string;

  minimal?: boolean;
  buttons?: CmsMarkdownWidgetButton[];
  editor_components?: string[];
  modes?: ('raw' | 'rich_text')[];

  /**
   * @deprecated Use editor_components instead
   */
  editorComponents?: string[];
}

export interface CmsFieldRichText {
  widget: 'richtext';
  default?: string;

  minimal?: boolean;
  buttons?: CmsMarkdownWidgetButton[];
  editor_components?: string[];
  modes?: ('raw' | 'rich_text')[];

  /**
   * @deprecated Use editor_components instead
   */
  editorComponents?: string[];
}

export interface CmsFieldNumber {
  widget: 'number';
  default?: string | number;

  value_type?: 'int' | 'float';
  min?: number;
  max?: number;

  step?: number | 'any';

  /**
   * @deprecated Use value_type instead
   */
  valueType?: 'int' | 'float';
}

interface CmsFieldSelectBase {
  widget: 'select';
  default?: string | number | string[] | number[];

  options: (string | number)[] | CmsSelectWidgetOptionObject[];
}

export type CmsFieldSelect =
  | (CmsFieldSelectBase & { multiple: true; min?: number; max?: number })
  | (CmsFieldSelectBase & { multiple?: false });

interface CmsFieldRelationBase {
  widget: 'relation';
  default?: string | string[];

  collection: string;
  value_field: string;
  search_fields: string[];
  file?: string;
  display_fields?: string[];
  options_length?: number;

  /**
   * @deprecated Use value_field instead
   */
  valueField?: string;
  /**
   * @deprecated Use search_fields instead
   */
  searchFields?: string[];
  /**
   * @deprecated Use display_fields instead
   */
  displayFields?: string[];
  /**
   * @deprecated Use options_length instead
   */
  optionsLength?: number;

  filters?: Array<{ field: string; values: (string | boolean | number)[] }>;
}

export type CmsFieldRelation =
  | (CmsFieldRelationBase & { multiple: true; min?: number; max?: number })
  | (CmsFieldRelationBase & { multiple?: false });

export interface CmsFieldHidden {
  widget: 'hidden';
  default?: unknown;
}

export interface CmsFieldStringOrText {
  // This is the default widget, so declaring its type is optional.
  widget?: 'string' | 'text';
  default?: string;
}

export interface CmsFieldMeta {
  name: string;
  label: string;
  widget: string;
  required: boolean;
  index_file?: string;
  meta: boolean;
}

export type CmsField = CmsFieldBase &
  (
    | CmsFieldBoolean
    | CmsFieldCode
    | CmsFieldColor
    | CmsFieldDateTime
    | CmsFieldFileOrImage
    | CmsFieldList
    | CmsFieldMap
    | CmsFieldMarkdown
    | CmsFieldRichText
    | CmsFieldNumber
    | CmsFieldObject
    | CmsFieldRelation
    | CmsFieldSelect
    | CmsFieldHidden
    | CmsFieldStringOrText
    | CmsFieldMeta
  );

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

export interface ViewFilter {
  label: string;
  field: string;
  pattern: string | boolean;
  id: string;
}

export interface ViewGroup {
  label: string;
  field: string;
  pattern?: string;
  id: string;
}

export interface SortableField {
  field: string;
  label?: string;
  default_sort?: boolean | 'asc' | 'desc';
}

export interface CmsCollection {
  name: string;
  label: string;
  label_singular?: string;
  description?: string;
  folder?: string;
  files?: CmsCollectionFile[];
  identifier_field?: string;
  summary?: string;
  slug?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  preview_path_preserve_slashes?: boolean;
  create?: boolean;
  delete?: boolean;
  editor?: {
    preview?: boolean;
    visualEditing?: boolean;
  };
  publish?: boolean;
  nested?: {
    depth: number;
  };
  type: typeof FOLDER | typeof FILES;
  meta?: { path?: { label: string; widget: string; index_file?: string } };

  /**
   * It accepts the following values: yml, yaml, toml, json, md, markdown, html
   *
   * You may also specify a custom extension not included in the list above, by specifying the format value.
   */
  extension?: string;
  format?: CmsCollectionFormatType;

  frontmatter_delimiter?: string[] | string;
  fields?: CmsField[];
  filter?: { field: string; value: unknown };
  path?: string;
  media_folder?: string;
  public_folder?: string;
  sortable_fields?: (string | SortableField)[];
  view_filters?: ViewFilter[];
  view_groups?: ViewGroup[];
  i18n?: boolean | CmsI18nConfig;

  /**
   * @deprecated Use sortable_fields instead
   */
  sortableFields?: (string | SortableField)[];
}

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
  signoff_commits?: boolean;
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

export interface CmsSlug {
  encoding?: CmsSlugEncoding;
  clean_accents?: boolean;
  sanitize_replacement?: string;
}

export interface CmsLocalBackend {
  url?: string;
  allowed_hosts?: string[];
}

export interface CmsIssueReports {
  url?: string;
}

export interface CmsConfig {
  backend: CmsBackend;
  collections: CmsCollection[];
  locale?: string;
  site_url?: string;
  display_url?: string;
  logo_url?: string; // Deprecated, replaced by `logo.src`
  logo?: {
    src: string;
    show_in_header?: boolean;
  };
  show_preview_links?: boolean;
  media_folder?: string;
  public_folder?: string;
  media_library?: CmsMediaLibrary;
  publish_mode?: CmsPublishMode;
  load_config_file?: boolean;
  integrations?: {
    hooks: string[];
    provider: string;
    collections?: '*' | string[];
    applicationID?: string;
    apiKey?: string;
    getSignedFormURL?: string;
  }[];
  slug?: CmsSlug;
  i18n?: CmsI18nConfig;
  issue_reports?: CmsIssueReports;
  local_backend?: boolean | CmsLocalBackend;
  editor?: {
    preview?: boolean;
  };
  search?: boolean;
  error: string | undefined;
  isFetching: boolean;
}

export type CmsMediaLibraryOptions = Record<string, unknown>;

export interface CmsMediaLibrary {
  name: string;
  config?: CmsMediaLibraryOptions;
}

export interface SlugConfig {
  encoding: string;
  clean_accents: boolean;
  sanitize_replacement: string;
}

type BackendObject = {
  name: string;
  repo?: string | null;
  open_authoring?: boolean;
  branch?: string;
  api_root?: string;
  squash_merges?: boolean;
  use_graphql?: boolean;
  preview_context?: string;
  identity_url?: string;
  gateway_url?: string;
  large_media_url?: string;
  use_large_media_transforms_in_media_library?: boolean;
  commit_messages: Record<string, string>;
};

type Backend = BackendObject;

export interface Config {
  backend: Backend;
  media_folder: string;
  public_folder: string;
  publish_mode?: string;
  media_library: { name: string };
  locale?: string;
  slug: SlugConfig;
  base_url?: string;
  site_id?: string;
  site_url?: string;
  show_preview_links?: boolean;
  isFetching?: boolean;
  integrations: Integration[];
  collections: { name: string }[];
}

type PagesObject = {
  [collection: string]: { isFetching: boolean; page: number; ids: string[] };
};

type Pages = PagesObject;

type EntitiesObject = { [key: string]: EntryMap };

export enum SortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
  None = 'None',
}

export type SortObject = { key: string; direction: SortDirection };

export type SortMap = Record<string, SortObject>;

export type Sort = Record<string, SortMap>;

export type FilterMap = ViewFilter & { active: boolean };

export type GroupMap = ViewGroup & { active: boolean };

export type Filter = Record<string, Record<string, FilterMap>>; // collection.field.active

export type Group = Record<string, Record<string, GroupMap>>; // collection.field.active

export type GroupOfEntries = {
  id: string;
  label: string;
  value: string | boolean | undefined;
  paths: string[];
};

export type Entities = EntitiesObject;

export interface Entries {
  pages: Pages;
  entities: Entities;
  sort: Sort;
  filter: Filter;
  group: Group;
  viewStyle: string;
}

export interface EditorialWorkflow {
  pages: Pages;
  entities: Entities;
}

export type EntryObject = {
  path: string;
  slug: string;
  data: Record<string, unknown>;
  i18n?: { [locale: string]: { data: Record<string, unknown> } };
  collection: string;
  mediaFiles: MediaFileMap[];
  newRecord: boolean;
  author?: string;
  updatedOn?: string;
  status: string;
  meta: { path: string };
};

export type EntryMap = EntryObject;

export type Entry = EntryObject;

export type FieldsErrors = Record<string, { type: string }[]>;

export interface EntryDraft {
  entry: Entry;
  fieldsErrors: FieldsErrors;
  fieldsMetaData?: Record<string, Record<string, string>>;
}

export interface EntryField {
  field?: EntryField;
  fields?: EntryField[];
  types?: EntryField[];
  widget: string;
  name: string;
  default: string | null | boolean | unknown[];
  media_folder?: string;
  multiple?: boolean;
  public_folder?: string;
  comment?: string;
  meta?: boolean;
  i18n: 'translate' | 'duplicate' | 'none';
}

export type EntryFields = EntryField[];

export type FilterRule = {
  value: string;
  field: string;
};

export interface CollectionFile {
  file: string;
  name: string;
  fields: EntryFields;
  label: string;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  preview_path_preserve_slashes?: boolean;
}

export type CollectionFiles = CollectionFile[];

type NestedObject = { depth: number; subfolders?: boolean; summary?: string };

type Nested = NestedObject;

type PathObject = { label: string; widget: string; index_file: string };

type MetaObject = {
  path?: PathObject;
};

type Meta = MetaObject;

interface i18n {
  structure: string;
  locales: string[];
  default_locale: string;
}

export type Format = keyof typeof formatExtensions | string;

type CollectionObject = {
  name: string;
  folder?: string;
  files?: CollectionFile[];
  fields: EntryField[];
  isFetching: boolean;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  preview_path_preserve_slashes?: boolean;
  summary?: string;
  filter?: { value: string; field: string };
  type: 'file_based_collection' | 'folder_based_collection';
  extension?: string;
  format?: Format;
  frontmatter_delimiter?: string[] | string | [string, string];
  create?: boolean;
  delete?: boolean;
  identifier_field?: string;
  path?: string;
  slug?: string;
  label_singular?: string;
  label: string;
  sortable_fields: SortableField[];
  view_filters: ViewFilter[];
  view_groups: ViewGroup[];
  nested?: NestedObject;
  meta?: MetaObject;
  i18n: i18n;
};

export type Collection = CollectionObject;

export type Collections = Record<string, CollectionObject>;

export interface MediaLibraryInstance {
  show: (args: {
    id?: string;
    value?: string;
    config: Record<string, unknown>;
    allowMultiple?: boolean;
    imagesOnly?: boolean;
  }) => void;
  hide: () => void;
  onClearControl: (args: { id: string }) => void;
  onRemoveControl: (args: { id: string }) => void;
  enableStandalone: () => boolean;
}

export type DisplayURL = { id: string; path: string } | string;

export type MediaFile = BackendMediaFile & { key?: string };

export type MediaFileMap = MediaFile;

type DisplayURLStateObject = {
  isFetching: boolean;
  url?: string;
  err?: Error;
};

export type DisplayURLState = DisplayURLStateObject;

interface DisplayURLsObject {
  [id: string]: DisplayURLState;
}

export interface MediaLibrary {
  externalLibrary?: MediaLibraryInstance;
  files: MediaFile[];
  displayURLs: DisplayURLsObject;
  isLoading: boolean;
}

export type Hook = string | boolean;

export interface Integrations {
  hooks: Record<string, string | Record<string, string>>;
}

export type Cursors = Record<string, unknown>;

export interface State {
  auth: Auth;
  config: CmsConfig;
  cursors: Cursors;
  collections: Collections;
  deploys: Deploys;
  globalUI: GlobalUI;
  editorialWorkflow: EditorialWorkflow;
  entries: Entries;
  entryDraft: EntryDraft;
  integrations: Integrations;
  medias: Medias;
  mediaLibrary: MediaLibrary;
  search: Search;
  status: Status;
  notifications: NotificationsState;
}

export interface Integration {
  hooks: string[];
  collections?: string | string[];
  provider: string;
}

interface EntryPayload {
  collection: string;
}

export interface EntryRequestPayload extends EntryPayload {
  slug: string;
}

export interface EntrySuccessPayload extends EntryPayload {
  entry: EntryObject;
}

export interface EntryFailurePayload extends EntryPayload {
  slug: string;
  error: Error;
}

export interface EntryDeletePayload {
  entrySlug: string;
  collectionName: string;
}

export type EntriesRequestPayload = EntryPayload;

export interface EntriesSuccessPayload extends EntryPayload {
  entries: EntryObject[];
  append: boolean;
  page: number;
}
export interface EntriesSortRequestPayload extends EntryPayload {
  key: string;
  direction: string;
}

export interface EntriesSortFailurePayload extends EntriesSortRequestPayload {
  error: Error;
}

export interface EntriesFilterRequestPayload {
  filter: ViewFilter;
  collection: string;
}

export interface EntriesFilterFailurePayload {
  filter: ViewFilter;
  collection: string;
  error: Error;
}

export interface EntriesGroupRequestPayload {
  group: ViewGroup;
  collection: string;
}

export interface EntriesGroupFailurePayload {
  group: ViewGroup;
  collection: string;
  error: Error;
}

export interface ChangeViewStylePayload {
  style: string;
}

export interface EntriesMoveSuccessPayload extends EntryPayload {
  entries: EntryObject[];
}

export interface EntriesAction extends Action<string> {
  payload:
    | EntryRequestPayload
    | EntrySuccessPayload
    | EntryFailurePayload
    | EntriesSuccessPayload
    | EntriesRequestPayload
    | EntryDeletePayload;
  meta: {
    collection: string;
  };
}

export interface EditorialWorkflowAction extends Action<string> {
  payload?: CmsConfig & {
    collection: string;
    entry: { slug: string };
  } & {
    collection: string;
    slug: string;
  } & {
    pages: [];
    entries: { collection: string; slug: string }[];
  } & {
    collection: string;
    entry: { slug: string };
  } & {
    collection: string;
    slug: string;
    newStatus: string;
  };
}
