import type { Action } from 'redux';
import type { StaticallyTypedRecord } from './immutable';
import type { Map, List, OrderedMap, Set } from 'immutable';
import type { FILES, FOLDER } from '../constants/collectionTypes';
import type { MediaFile as BackendMediaFile } from '../backend';
import type { Auth } from '../reducers/auth';
import type { CredentialsState } from '../reducers/credentials';
import type { Status } from '../reducers/status';
import type { Medias } from '../reducers/medias';
import type { Deploys } from '../reducers/deploys';
import type { Search } from '../reducers/search';
import type { GlobalUI } from '../reducers/globalUI';
import type { NotificationsState } from '../reducers/notifications';
import type { formatExtensions } from '../formats/formats';
import type { StandardSchemaV1 } from './standardSchema';

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

// 'repo' and 'public_repo' are the documented defaults and autocomplete as
// literals, but the github backend passes auth_scope straight through to the
// OAuth `scope` param with no allowlist, so any GitHub OAuth scope string
// (e.g. 'repo:status', 'read:org') is valid at runtime. See DCMS-419.
export type CmsAuthScope = 'repo' | 'public_repo' | (string & {});

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
  pattern?: [string | RegExp, string];
  i18n?: boolean | 'translate' | 'duplicate' | 'none';
  media_folder?: string;
  public_folder?: string;
  comment?: string;
  visualEditing?: boolean;
  /**
   * Opt-in field-level validation via any Standard Schema-compliant validator
   * (zod, valibot, arktype, effect Schema, ...), see
   * https://github.com/standard-schema/standard-schema. When set, this schema's
   * `~standard.validate` issues become the field's error output, in place of
   * (not in addition to) the built-in `required`/`pattern` checks. Fields that
   * don't set `validate` keep the existing widget validation DSL unchanged.
   */
  validate?: StandardSchemaV1<unknown, unknown>;
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
  /**
   * `meta.path.index_file` sets the filename (without extension) used for
   * every entry's data file within the directory chosen via the nested
   * collection's `path` field, e.g. `_index` writes `_index.md`. If omitted,
   * the filename is generated from the entry's `title` field, or preserved
   * as-is for existing entries.
   */
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
   * Explicit list of field names searched by the sidebar search box and the
   * `search`/`query` backend methods. When omitted, search fields are
   * inferred from `summary`/`title`/`shortTitle`/`author` (or, for `files`
   * collections, all top-level fields).
   */
  search_fields?: string[];

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
    /** Shown in the header by default once `src` is set; set to `false` to hide it there. */
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
  /**
   * URL of the auth-gated credential store endpoint used to resolve
   * `{ credential: string }` references in the (public) config, e.g. inside
   * `media_library.config`. See `actions/credentials.ts`.
   */
  credentials_url?: string;
  error: string | undefined;
  isFetching: boolean;
}

/** A reference to a named secret, resolved via the credential store instead of being embedded in the public config. */
export interface CmsCredentialRef {
  credential: string;
}

export type CmsMediaLibraryOptions = Record<string, unknown>;

export interface CmsMediaLibrary {
  name: string;
  config?: CmsMediaLibraryOptions;
  output_filename_only?: boolean;
  use_transformations?: boolean;
  use_secure_url?: boolean;
}

export type SlugConfig = StaticallyTypedRecord<{
  encoding: string;
  clean_accents: boolean;
  sanitize_replacement: string;
}>;

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
  netlify_api_token?: string;
  commit_messages: Map<string, string>;
};

type Backend = StaticallyTypedRecord<Backend> & BackendObject;

export type Config = StaticallyTypedRecord<{
  backend: Backend;
  media_folder: string;
  public_folder: string;
  publish_mode?: string;
  media_library: StaticallyTypedRecord<{ name: string }> & { name: string };
  locale?: string;
  slug: SlugConfig;
  base_url?: string;
  site_id?: string;
  site_url?: string;
  show_preview_links?: boolean;
  isFetching?: boolean;
  integrations: List<Integration>;
  collections: List<StaticallyTypedRecord<{ name: string }>>;
}>;

type PagesObject = {
  [collection: string]: { isFetching: boolean; page: number; ids: List<string> };
};

type Pages = StaticallyTypedRecord<PagesObject>;

type EntitiesObject = { [key: string]: EntryMap };

export enum SortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
  None = 'None',
}

export type SortObject = { key: string; direction: SortDirection };

export type SortMap = OrderedMap<string, StaticallyTypedRecord<SortObject>>;

export type Sort = Map<string, SortMap>;

export type FilterMap = StaticallyTypedRecord<ViewFilter & { active: boolean }>;

export type GroupMap = StaticallyTypedRecord<ViewGroup & { active: boolean }>;

export type Filter = Map<string, Map<string, FilterMap>>; // collection.field.active

export type Group = Map<string, Map<string, GroupMap>>; // collection.field.active

export type GroupOfEntries = {
  id: string;
  label: string;
  value: string | boolean | undefined;
  paths: Set<string>;
};

export type Entities = StaticallyTypedRecord<EntitiesObject>;

export type Entries = StaticallyTypedRecord<{
  pages: Pages & PagesObject;
  entities: Entities & EntitiesObject;
  sort: Sort;
  filter: Filter;
  group: Group;
  viewStyle: string;
}>;

export type EditorialWorkflow = StaticallyTypedRecord<{
  pages: Pages & PagesObject;
  entities: Entities & EntitiesObject;
}>;

export type EntryObject = {
  path: string;
  slug: string;
  data: Record<string, unknown>;
  i18n?: { [locale: string]: { data: Record<string, unknown> } };
  collection: string;
  mediaFiles: List<MediaFileMap>;
  newRecord: boolean;
  author?: string;
  updatedOn?: string;
  status: string;
  publishAt?: string;
  isFetching?: boolean;
  isPersisting?: boolean;
  isPublishing?: boolean;
  isUpdatingStatus?: boolean;
  meta: StaticallyTypedRecord<{ path: string }>;
};

export type EntryMap = StaticallyTypedRecord<EntryObject>;

export type Entry = EntryMap & EntryObject;

export type FieldsErrors = StaticallyTypedRecord<{ [field: string]: { type: string }[] }>;

export type EntryDraft = StaticallyTypedRecord<{
  entry: Entry;
  fieldsErrors: FieldsErrors;
  fieldsMetaData?: Map<string, Map<string, string>>;
}>;

export type EntryField = StaticallyTypedRecord<{
  field?: EntryField;
  fields?: List<EntryField>;
  types?: List<EntryField>;
  widget: string;
  name: string;
  default: string | null | boolean | List<unknown>;
  media_folder?: string;
  multiple?: boolean;
  public_folder?: string;
  comment?: string;
  meta?: boolean;
  i18n: boolean | 'translate' | 'duplicate' | 'none';
  required?: boolean;
  media_library?: StaticallyTypedRecord<CmsMediaLibrary & { allow_multiple?: boolean }>;
}>;

export type EntryFields = List<EntryField>;

export type FilterRule = StaticallyTypedRecord<{
  value: string;
  field: string;
}>;

export type CollectionFile = StaticallyTypedRecord<{
  file: string;
  name: string;
  fields: EntryFields;
  label: string;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  preview_path_preserve_slashes?: boolean;
}>;

export type CollectionFiles = List<CollectionFile>;

type NestedObject = { depth: number; subfolders?: boolean; summary?: string };

type Nested = StaticallyTypedRecord<NestedObject>;

type PathObject = { label: string; widget: string; index_file: string };

type MetaObject = {
  path?: StaticallyTypedRecord<PathObject>;
};

type Meta = StaticallyTypedRecord<MetaObject>;

type i18n = StaticallyTypedRecord<{
  structure: string;
  locales: string[];
  default_locale: string;
}>;

export type Format = keyof typeof formatExtensions | string;

type CollectionObject = {
  name: string;
  folder?: string;
  files?: CollectionFiles;
  fields: EntryFields;
  isFetching: boolean;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  preview_path_date_field?: string;
  preview_path_preserve_slashes?: boolean;
  summary?: string;
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
  search_fields?: List<string>;
  view_filters: List<StaticallyTypedRecord<ViewFilter>>;
  view_groups: List<StaticallyTypedRecord<ViewGroup>>;
  nested?: Nested;
  meta?: Meta;
  i18n: i18n;
};

export type Collection = StaticallyTypedRecord<CollectionObject>;

export type Collections = StaticallyTypedRecord<{ [path: string]: Collection & CollectionObject }>;

export interface MediaLibraryInstance {
  show: (args: {
    id?: string;
    value?: string;
    config: StaticallyTypedRecord<{}>;
    allowMultiple?: boolean;
    imagesOnly?: boolean;
    /**
     * Field-level `media_library` options other than `name`/`config`/`allow_multiple`
     * (e.g. Cloudinary's `output_filename_only`/`use_transformations`/`use_secure_url`).
     * Integrations may use this to override their globally configured options
     * on a per-field basis.
     */
    options?: CmsMediaLibraryOptions;
  }) => void;
  hide: () => void;
  onClearControl: (args: { id: string }) => void;
  onRemoveControl: (args: { id: string }) => void;
  enableStandalone: () => boolean;
}

export type DisplayURL = { id: string; path: string } | string;

export type MediaFile = BackendMediaFile & { key?: string };

export type MediaFileMap = StaticallyTypedRecord<MediaFile>;

type DisplayURLStateObject = {
  isFetching: boolean;
  url?: string;
  err?: Error;
};

export type DisplayURLState = StaticallyTypedRecord<DisplayURLStateObject>;

interface DisplayURLsObject {
  [id: string]: DisplayURLState;
}

export type MediaLibrary = StaticallyTypedRecord<{
  externalLibrary?: MediaLibraryInstance;
  files: MediaFile[];
  displayURLs: StaticallyTypedRecord<DisplayURLsObject> & DisplayURLsObject;
  isLoading: boolean;
}>;

export type Hook = string | boolean;

export type Integrations = StaticallyTypedRecord<{
  hooks: { [collectionOrHook: string]: string | Record<string, string> };
}>;

export interface Cursors {
  cursorsByType: {
    collectionEntries: Record<string, unknown>;
  };
}

export interface State {
  auth: Auth;
  config: CmsConfig;
  credentials: CredentialsState;
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
    entry: StaticallyTypedRecord<{ slug: string }>;
  } & {
    collection: string;
    slug: string;
    newStatus: string;
  } & {
    collection: string;
    slug: string;
    publishAt?: string;
  };
}
