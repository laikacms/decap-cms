import type {
  CmsAllowedEvent,
  CmsEditorComponentOptions,
  CmsEditorComponentPlugin,
  CmsEventHandler,
  CmsEventListener,
  CmsEventListenerOptions,
  CmsFormatter,
  CmsFormatterFunctions,
  CmsGetAssetFunction,
  CmsLocalePhrases,
  CmsPublishMode,
  CmsSlug,
} from './common';
import type { CmsI18nConfig } from './i18n';
import type { CmsBackend, CmsBackendClass, CmsLocalBackend, CmsRegistryBackend } from './backend';
import type { CmsMediaLibrary, CmsMediaLibraryOptions } from './media';
import type { CmsCollection } from './collections';
import type { ComponentType } from '../core';

export interface CmsIssueReports {
  url?: string;
}

export interface CmsConfig<Backend extends CmsBackend = CmsBackend> {
  backend: Backend;
  collections: CmsCollection[];
  locale?: string;
  site_url?: string;
  display_url?: string;
  logo_url?: string; // Deprecated, replaced by `logo.src`
  logo?: {
    src: string;
    show_in_header?: boolean;
  };
  app_id?: string;
  always_fork?: boolean;
  auth_token_endpoint?: string;
  show_preview_links?: boolean;
  media_folder?: string;
  public_folder?: string;
  base_url?: string;
  site_id?: string;
  media_folder_relative?: boolean;
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

export interface CmsWidgetParam<T = unknown> {
  name: string;
  controlComponent: unknown;
  previewComponent?: unknown;
  globalStyles?: unknown;
}

export type CmsWidgetControlComponent = ComponentType<unknown>;

export type CmsWidgetPreviewComponent = ComponentType<unknown>;

export interface CmsWidget<T = unknown> {
  control: CmsWidgetControlComponent;
  preview?: CmsWidgetPreviewComponent;
  globalStyles?: unknown;
}

export type CmsWidgetValueSerializer = unknown; // TODO: type properly

export interface CmsMediaLibraryWithOptions extends CmsMediaLibrary {
  options?: CmsMediaLibraryOptions;
}

export type CmsPreviewStyle = string;

export interface CmsRegistry {
  backends: {
    [name: string]: CmsRegistryBackend;
  };
  templates: {
    [name: string]: ComponentType<unknown>;
  };
  previewStyles: CmsPreviewStyle[];
  eventHandlers: {
    [event in CmsAllowedEvent]: CmsEventHandler[];
  };
  remarkPlugins: unknown[];
  widgets: {
    [name: string]: CmsWidget;
  };
  editorComponents: Record<string, CmsEditorComponentPlugin>;
  widgetValueSerializers: {
    [name: string]: CmsWidgetValueSerializer;
  };
  mediaLibraries: CmsMediaLibraryWithOptions[];
  locales: {
    [name: string]: CmsLocalePhrases;
  };
  formats: {
    [name: string]: CmsFormatter;
  };
}

export type CmsPreviewTemplateComponentProps = {
  entry: Record<string, unknown>;
  collection: Record<string, unknown>;
  getCollection: (collectionName: string, slug?: string) => Promise<Record<string, unknown>[]>;
  widgetFor: (
    name: unknown,
    fields?: unknown,
    values?: unknown,
    fieldsMetaData?: unknown,
  ) => unknown;
  widgetsFor: (name: unknown) => unknown;
  getAsset: CmsGetAssetFunction;
  boundGetAsset: (collection: unknown, path: unknown) => CmsGetAssetFunction;
  fieldsMetaData: Record<string, unknown>;
  config: Record<string, unknown>;
  fields: Record<string, unknown>[];
  isLoadingAsset: boolean;
  window: Window;
  document: Document;
};

export interface CmsInitOptions {
  config: CmsConfig;
}

export interface CmsPreviewStyleOptions {
  raw: boolean;
}

export interface CmsCMS {
  getBackend: (name: string) => CmsRegistryBackend | undefined;
  getEditorComponents: () => Record<string, ComponentType<unknown>>;
  getRemarkPlugins: () => Array<unknown>;
  getLocale: (locale: string) => CmsLocalePhrases | undefined;
  getMediaLibrary: (name: string) => CmsMediaLibrary | undefined;
  getPreviewStyles: () => CmsPreviewStyle[];
  getPreviewTemplate: (name: string) => ComponentType<CmsPreviewTemplateComponentProps> | undefined;
  getWidget: (name: string) => CmsWidget | undefined;
  getWidgetValueSerializer: (widgetName: string) => CmsWidgetValueSerializer | undefined;
  init: (options?: CmsInitOptions) => void;
  registerBackend: (name: string, backendClass: CmsBackendClass) => void;
  registerEditorComponent: (options: CmsEditorComponentOptions) => void;
  registerRemarkPlugin: (plugin: unknown) => void;
  registerEventListener: (
    eventListener: CmsEventListener,
    options?: CmsEventListenerOptions,
  ) => void;
  registerLocale: (locale: string, phrases: CmsLocalePhrases) => void;
  registerMediaLibrary: (mediaLibrary: CmsMediaLibrary, options?: CmsMediaLibraryOptions) => void;
  registerPreviewStyle: (filePath: string, options?: CmsPreviewStyleOptions) => void;
  registerPreviewTemplate: (
    name: string,
    component: ComponentType<CmsPreviewTemplateComponentProps>,
  ) => void;
  registerWidget: (
    widget: string | CmsWidgetParam,
    control?: CmsWidgetControlComponent,
    preview?: CmsWidgetPreviewComponent,
  ) => void;
  registerWidgetValueSerializer: (widgetName: string, serializer: CmsWidgetValueSerializer) => void;
  resolveWidget: (name: string) => CmsWidget | undefined;
  registerCustomFormat: (name: string, extension: string, formatter: CmsFormatterFunctions) => void;
}
