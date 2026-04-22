

import type { List, Map, OrderedMap, Set } from 'immutable';
import type Cursor from "../../Cursor";
import type { Action, AssetProxy, Credentials, DisplayURL, Pages, PersistOptions, QueryRequest, User, ViewFilter, ViewGroup } from "./common";
import type { Entities, Entries, Entry, EntryDraft, EntryMap, EntryObject, EntryValue, FileEntry, ImplementationEntry, ImplementationFile, UnpublishedEntry } from "./entries";
import type { ImplementationMediaFile, MediaLibrary, MediaLibraryOptions } from "./media";
import type { StaticallyTypedRecord } from "../immutable";
import type { Backend } from "./backend";
import type { SlugConfig } from "./common";
import type { CmsConfig } from '../cms/cms';
import type { Collection, Collections } from './collection';
import type { ComponentType, JSXElement, Pluggable, TranslateFunction } from '../core';
import type { CmsMediaLibraryOptions } from '../cms/media';
import type { EditorComponentOptions, EditorComponentPlugin } from './editor';

export type Auth = {
  isFetching: boolean;
  user: User | undefined;
  error: string | undefined;
}

export type Deploys = {
  [key: string]: {
    isFetching: boolean;
    url?: string;
    status?: string;
  };
}

export type GlobalUI = {
  isFetching: boolean;
  useOpenAuthoring: boolean;
}

export type Medias = {
  [path: string]: {
    asset: AssetProxy | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}

export interface NotificationMessage {
  key: string;
  details?: unknown;
}

export type CmsNotification = {
  id: string;
  message: string | NotificationMessage;
  dismissAfter?: number;
  type: 'info' | 'success' | 'warning' | 'error' | 'default' | undefined;
};

export type NotificationsState = {
  notifications: CmsNotification[];
}

export type Status = {
  isFetching: boolean;
  status: {
    auth: {
      status: boolean;
    };
    api: {
      status: boolean;
      statusPage: string;
    };
  };
  error: Error | undefined;
}

export type Search = {
    isFetching: boolean;
    term: string;
    collections: string[];
    page: number;
    entryIds: {
        collection: string;
        slug: string;
    }[];
    queryHits: Record<string, EntryValue[]>;
    error: Error | undefined;
    requests: QueryRequest[];
}

export type Hook = string | boolean;

export type Cursors = Map<string, string>;

export interface State {
  auth: Auth;
  config: CmsConfig; // Use CmsConfig from domain folder
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

export type EditorialWorkflow = StaticallyTypedRecord<{
  pages: Pages;
  entities: Entities;
}>;

export type Integrations = StaticallyTypedRecord<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hooks: { [collectionOrHook: string]: any };
}>;

export interface Integration {
  hooks: string[];
  collections?: string | string[];
  provider: string;
}

// export type Config = StaticallyTypedRecord<{
//   backend: Backend;
//   media_folder: string;
//   public_folder: string;
//   publish_mode?: string;
//   media_library: StaticallyTypedRecord<{ name: string }>;
//   locale?: string;
//   slug: SlugConfig;
//   media_folder_relative?: boolean;
//   base_url?: string;
//   site_id?: string;
//   site_url?: string;
//   show_preview_links?: boolean;
//   isFetching?: boolean;
//   integrations: List<Integration>;
//   collections: List<StaticallyTypedRecord<{ name: string }>>;
// }>;

export type Config = {
  backend: {
    repo?: string | null;
    open_authoring?: boolean;
    always_fork?: boolean;
    branch?: string;
    api_root?: string;
    squash_merges?: boolean;
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
  auth: {
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
  media_folder: string;
  base_url?: string;
  site_id?: string;
};

export interface Implementation {
  authComponent: () => void;
  restoreUser: (user: User) => Promise<User>;

  authenticate: (credentials: Credentials) => Promise<User>;
  logout: () => Promise<void> | void | null;
  getToken: () => Promise<string | null>;

  getEntry: (path: string) => Promise<ImplementationEntry>;
  entriesByFolder: (
    folder: string,
    extension: string,
    depth: number,
  ) => Promise<ImplementationEntry[]>;
  entriesByFiles: (files: ImplementationFile[]) => Promise<ImplementationEntry[]>;

  getMediaDisplayURL?: (displayURL: DisplayURL) => Promise<string>;
  getMedia: (folder?: string) => Promise<ImplementationMediaFile[]>;
  getMediaFile: (path: string) => Promise<ImplementationMediaFile>;

  persistEntry: (entry: FileEntry, opts: PersistOptions) => Promise<void>;
  persistMedia: (file: AssetProxy, opts: PersistOptions) => Promise<ImplementationMediaFile>;
  deleteFiles: (paths: string[], commitMessage: string) => Promise<void>;

  unpublishedEntries: () => Promise<string[]>;
  unpublishedEntry: (args: {
    id?: string;
    collection?: string;
    slug?: string;
  }) => Promise<UnpublishedEntry>;
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
  ) => Promise<ImplementationMediaFile>;
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
  ) => Promise<ImplementationEntry[]>;
  traverseCursor?: (
    cursor: Cursor,
    action: string,
  ) => Promise<{ entries: ImplementationEntry[]; cursor: Cursor }>;

  isGitBackend?: () => boolean;
  status: () => Promise<{
    auth: { status: boolean };
    api: { status: boolean; statusPage: string };
  }>;
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
  };
}


export interface EntryPayload {
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

export interface InitOptions {
  config: CmsConfig;
}

export interface PreviewStyleOptions {
  raw: boolean;
}

export interface PreviewStyle extends PreviewStyleOptions {
  value: string;
}

export interface WidgetProps<T = unknown> {
  controlComponent: ComponentType<Record<string, unknown>>;
  field: Map<string, unknown>;
  hasActiveStyle?: boolean;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  classNameWrapper: string;
  classNameWidget: string;
  classNameWidgetActive: string;
  classNameLabel: string;
  classNameLabelActive: string;
  value?: T;
  mediaPaths: Map<string, string>;
  metadata?: Map<string, Map<string, unknown>>;
  fieldsErrors?: Map<string, { type: string; message: string }[]>;
  onChange: ((value: T) => void) | ((value: T, metadata?: Record<string, unknown>) => void);
  onValidate?: (errors: (ValidationError | false)[]) => void;
  controlRef?: (wrappedControl: ComponentType<WidgetProps>) => void;
  onOpenMediaLibrary: (options: Record<string, unknown>) => void;
  onClearMediaControl: (controlID: string) => void;
  onRemoveMediaControl: (controlID: string) => void;
  onPersistMedia: (file: File) => void;
  onAddAsset: (asset: AssetProxy) => void;
  onRemoveInsertedMedia: (controlID: string) => void;
  getAsset: (path: string, field: Map<string, unknown>) => AssetProxy;
  resolveWidget: (name: string) => Record<string, unknown>;
  widget: Record<string, unknown>;
  getEditorComponents: () => Map<string, unknown>;
  isFetching?: boolean;
  query: (
    namespace: string,
    collectionName: string,
    searchFields: string[],
    searchTerm: string,
    file?: string,
    limit?: number,
  ) => void;
  clearSearch: () => void;
  clearFieldErrors: (uniqueFieldId: string) => void;
  queryHits?: unknown[] | Record<string, unknown>;
  editorControl: ComponentType<Record<string, unknown>>;
  uniqueFieldId: string;
  loadEntry: (collectionName: string, slug: string) => void;
  t: TranslateFunction;
  onValidateObject?: (errors: { type: string; message: string }[]) => void;
  isEditorComponent?: boolean;
  isNewEditorComponent?: boolean;
  /**
   * @deprecated Every update creates a new entry, passing a live value down is too expensive. Use the getEntry callback instead or get the value from the store directly in the widget via `useSelector` or `connect`.
   */
  entry: Entry;
  getEntry: (collectionName: string, slug: string) => Entry | undefined;
  isDisabled?: boolean;
  isFieldDuplicate?: (field: Map<string, unknown>) => boolean;
  isFieldHidden?: (field: Map<string, unknown>) => boolean;
  locale?: string;
  isParentListCollapsed?: boolean;
  isLoadingAsset?: boolean;
  parentIds?: string[];
  validateMetaField?: (
    field: Map<string, unknown>,
    value: unknown,
    t: TranslateFunction,
  ) => ValidationResult;
  collection?: Collection;
  config?: CmsConfig;
}

export interface ValidationError {
  type: string;
  parentIds?: string[];
  message: string;
}

export interface ValidationResult {
  error: ValidationError | false;
}

export interface WidgetControlProps<T = unknown> {
  entry: EntryMap;
  getEntry: (collectionName: string, slug: string) => EntryMap | undefined;
  collection: Collection;
  config: CmsConfig;
  field: Map<string, unknown>;
  value: T;
  mediaPaths: Map<string, string>;
  metadata: Map<string, Map<string, unknown>>;
  onChange: (value: T, metadata?: Record<string, unknown>) => void;
  onValidateObject: (errors: { type: string; message: string }[]) => void;
  onOpenMediaLibrary: (options: Record<string, unknown>) => void;
  onClearMediaControl: (controlID: string) => void;
  onRemoveMediaControl: (controlID: string) => void;
  onPersistMedia: (file: File) => void;
  onAddAsset: (asset: AssetProxy) => void;
  onRemoveInsertedMedia: (controlID: string) => void;
  getAsset: (path: string, field: Map<string, unknown>) => AssetProxy;
  classNameWrapper: string;
  classNameWidget: string;
  classNameWidgetActive: string;
  classNameLabel: string;
  classNameLabelActive: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  hasActiveStyle: boolean;
  editorControl: ComponentType<Record<string, unknown>>;
  resolveWidget: (name: string) => Record<string, unknown>;
  widget: Record<string, unknown>;
  getEditorComponents: () => Map<string, unknown>;
  query: (
    namespace: string,
    collectionName: string,
    searchFields: string[],
    searchTerm: string,
    file?: string,
    limit?: number,
  ) => void;
  queryHits?: unknown[] | Record<string, unknown>;
  clearSearch: () => void;
  clearFieldErrors: (uniqueFieldId: string) => void;
  isFetching?: boolean;
  loadEntry: (collectionName: string, slug: string) => void;
  isEditorComponent?: boolean;
  isNewEditorComponent?: boolean;
  fieldsErrors?: Map<string, { type: string; message: string }[]>;
  controlRef?: (wrappedControl: ComponentType<WidgetProps>) => void;
  parentIds?: string[];
  t: TranslateFunction;
  isDisabled?: boolean;
  isFieldDuplicate?: (field: Map<string, unknown>) => boolean;
  isFieldHidden?: (field: Map<string, unknown>) => boolean;
  locale?: string;
  isParentListCollapsed?: boolean;
  onChangeObject: (field: Map<string, unknown>, newValue: T, newMetadata: Record<string, unknown> | undefined) => void;
  forID: string;
  ref: (ref: any) => void;
  validate: (skipWrapped?: boolean | ValidationResult) => void;
  getRemarkPlugins: () => unknown[]
}

export type WidgetInputProps<T = unknown> = Partial<WidgetControlProps<T>> & Pick<WidgetControlProps<T>, 'field' | 'value' | 'onChange' | 't' | 'forID'>;

/**
 * A widget control component type that accepts any component whose props are
 * a subset of WidgetControlProps. This allows third-party widgets to only
 * declare the props they actually use, while still being compatible with the
 * full set of props that the CMS will pass at runtime.
 */
export type WidgetControlComponent<T = unknown> = ComponentType<any>;

export interface WidgetPreviewProps<T = unknown> {
  value: T;
  field: Map<string, any>;
  metadata: Map<string, any>;
  getAsset: GetAssetFunction;
  entry: Map<string, any>;
  fieldsMetaData: Map<string, any>;
}

/**
 * A widget preview component type that accepts any component whose props are
 * a subset of CmsWidgetPreviewProps. This allows third-party widgets to only
 * declare the props they actually use, while still being compatible with the
 * full set of props that the CMS will pass at runtime.
 */
export type WidgetPreviewComponent<T = unknown> = ComponentType<any>;

export interface WidgetParam<T = unknown> {
  name: string;
  controlComponent: WidgetControlComponent<T>;
  previewComponent?: WidgetPreviewComponent<T>;
  globalStyles?: any;
}

export interface Widget<T = unknown> {
  control: WidgetControlComponent<T>;
  preview?: WidgetPreviewComponent<T>;
  globalStyles?: any;
}

export type WidgetValueSerializer = any; // TODO: type properly

export interface EventListener {
  name: 'prePublish' | 'postPublish' | 'preUnpublish' | 'postUnpublish' | 'preSave' | 'postSave';
  handler: ({
    entry,
    author,
  }: {
    entry: Map<string, any>;
    author: { login: string; name: string };
  }) => any;
}

export type EventListenerOptions = any; // TODO: type properly

export type LocalePhrases = any; // TODO: type properly

export type FormatterFunctions = {
  fromFile(content: string): unknown;
  toFile(data: object, sortedKeys?: string[], comments?: Record<string, string>): string;
};

export type Formatter = {
  extension: string;
  formatter: FormatterFunctions;
};

export type AllowedEvent =
  'prePublish' |
  'postPublish' |
  'preUnpublish' |
  'postUnpublish' |
  'preSave' |
  'postSave';

export interface EventHandler {
  handler: Function;
  options: Record<string, unknown>;
}

export interface MediaLibraryWithOptions extends MediaLibrary {
  options?: MediaLibraryOptions;
}

export type CmsBackendClass = unknown; // TODO: type properly

export interface CmsRegistryBackend {
  init: (args: unknown) => CmsBackendClass;
}

export interface Registry {
  backends: {
    [name: string]: CmsRegistryBackend;
  };
  templates: {
    [name: string]: ComponentType<any>;
  };
  previewStyles: PreviewStyle[];
  eventHandlers: {
    [event in AllowedEvent]: EventHandler[];
  }
  remarkPlugins: unknown[]
  widgets: {
    [name: string]: Widget;
  };
  editorComponents: Map<string, EditorComponentPlugin>;
  widgetValueSerializers: {
    [name: string]: WidgetValueSerializer;
  };
  mediaLibraries: MediaLibraryWithOptions[];
  locales: {
    [name: string]: LocalePhrases;
  };
  formats: {
    [name: string]: Formatter;
  };
}

type GetAssetFunction = (asset: string) => {
  url: string;
  path: string;
  field?: any;
  fileObj: File;
};

export type PreviewTemplateComponentProps = {
  entry: Map<string, any>;
  collection: Map<string, any>;
  getCollection: (collectionName: string, slug?: string) => Promise<Map<string, any>[]>;
  widgetFor: (name: any, fields?: any, values?: any, fieldsMetaData?: any) => JSXElement | null;
  widgetsFor: (name: any) => any;
  getAsset: GetAssetFunction;
  boundGetAsset: (collection: any, path: any) => GetAssetFunction;
  fieldsMetaData: Map<string, any>;
  config: Map<string, any>;
  fields: List<Map<string, any>>;
  isLoadingAsset: boolean;
  window: Window;
  document: Document;
};

export interface CMS {
  getBackend: (name: string) => CmsRegistryBackend | undefined;
  getEditorComponents: () => Map<string, ComponentType<any>>;
  getRemarkPlugins: () => Array<Pluggable>;
  getLocale: (locale: string) => LocalePhrases | undefined;
  getMediaLibrary: (name: string) => MediaLibrary | undefined;
  getPreviewStyles: () => PreviewStyle[];
  getPreviewTemplate: (name: string) => ComponentType<PreviewTemplateComponentProps> | undefined;
  getWidget: (name: string) => Widget | undefined;
  getWidgetValueSerializer: (widgetName: string) => WidgetValueSerializer | undefined;
  init: (options?: InitOptions) => void;
  registerBackend: (name: string, backendClass: CmsBackendClass) => void;
  registerEditorComponent: (options: EditorComponentOptions) => void;
  registerRemarkPlugin: (plugin: Pluggable) => void;
  registerEventListener: (
    eventListener: EventListener,
    options?: EventListenerOptions,
  ) => void;
  registerLocale: (locale: string, phrases: LocalePhrases) => void;
  registerMediaLibrary: (mediaLibrary: MediaLibrary, options?: MediaLibraryOptions) => void;
  registerPreviewStyle: (filePath: string, options?: PreviewStyleOptions) => void;
  registerPreviewTemplate: (
    name: string,
    component: ComponentType<PreviewTemplateComponentProps>,
  ) => void;
  registerWidget: (
    widget: string | WidgetParam,
    control?: WidgetControlComponent,
    preview?: WidgetPreviewComponent,
  ) => void;
  registerWidgetValueSerializer: (
    widgetName: string,
    serializer: WidgetValueSerializer,
  ) => void;
  resolveWidget: (name: string) => Widget | undefined;
  registerCustomFormat: (name: string, extension: string, formatter: FormatterFunctions) => void;
}

