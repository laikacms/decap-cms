/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'decap-cms-core' {
  import type { ComponentType } from 'react';
  import type { List, Map } from 'immutable';
  import type { Pluggable } from 'unified';
  export type CmsBackendType =
    | 'azure'
    | 'git-gateway'
    | 'github'
    | 'gitlab'
    | 'gitea'
    | 'bitbucket'
    | 'test-repo'
    | 'proxy'
    | 'aws-cognito-github-proxy';

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
    value: string | number;
  }

  export type CmsCollectionFormatType = string;

  // 'repo' and 'public_repo' are the documented defaults and autocomplete as
  // literals, but the github backend passes auth_scope straight through to
  // the OAuth `scope` param with no allowlist, so any GitHub OAuth scope
  // string (e.g. 'repo:status', 'read:org') is valid at runtime. See DCMS-419.
  export type CmsAuthScope = 'repo' | 'public_repo' | (string & {});

  export type CmsPublishMode = 'simple' | 'editorial_workflow' | '';

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
    /** RegExp is only valid when using the JS API; YAML/JSON config only supports string patterns. */
    pattern?: [string | RegExp, string];
    i18n?: boolean | 'translate' | 'duplicate' | 'none';
    media_folder?: string;
    public_folder?: string;
    comment?: string;
    tagname?: string;
    visualEditing?: boolean;
  }

  export interface CmsFieldBoolean {
    widget: 'boolean';
    default?: boolean;
  }

  export interface CmsFieldCode {
    widget: 'code';
    default?: string | { code?: string; lang?: string };

    default_language?: string;
    allow_language_selection?: boolean;
    keys?: { code?: string; lang?: string };
    output_code_only?: boolean;
  }

  export interface CmsFieldColor {
    widget: 'color';
    default?: string;

    allow_input?: boolean;
    enable_alpha?: boolean;

    /** @deprecated Use allow_input instead */
    allowInput?: boolean;
    /** @deprecated Use enable_alpha instead */
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

    class?: string;
    /** Use `media_library.config` to pass options to the media library for this field. */
    media_library?: CmsMediaLibrary & { allow_multiple?: boolean };
    choose_url?: boolean;
    private?: boolean;
  }

  export interface CmsFieldObject {
    widget: 'object';
    default?: unknown;

    collapsed?: boolean;
    summary?: string;
    field?: CmsField;
    fields?: CmsField[];
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

    /** @remarks Must be a whole number (integer). Non-integer values pass TypeScript but are rejected by config schema validation. */
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
    sanitize_preview?: boolean;

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
    sanitize_preview?: boolean;

    /**
     * @deprecated Use editor_components instead
     */
    editorComponents?: string[];
  }

  export interface CmsFieldNumber {
    widget: 'number';
    default?: number;

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
    /** @remarks Must be a whole number (integer). Non-integer values pass TypeScript but are rejected by config schema validation. */
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
    /**
     * When `true`, preserves `/` characters in sanitized `preview_path`
     * template segments (e.g. `{{dirname}}`) instead of stripping/replacing
     * them. Defaults to `false`, unless the collection has `nested` set, in
     * which case slashes are preserved by default. Overrides the
     * collection-level setting when defined on a file.
     */
    preview_path_preserve_slashes?: boolean;
    i18n?: boolean | CmsI18nConfig;
    media_folder?: string;
    public_folder?: string;
  }

  export interface ViewFilter {
    label: string;
    field: string;
    pattern: string | boolean;
  }

  export interface ViewGroup {
    label: string;
    field: string;
    pattern?: string;
  }

  export interface SortableField {
    field: string;
    label?: string;
    default_sort?: 'asc' | 'desc';
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
    /**
     * When `true`, preserves `/` characters in sanitized `preview_path`
     * template segments (e.g. `{{dirname}}`) instead of stripping/replacing
     * them. Defaults to `false`, unless `nested` is set on the collection, in
     * which case slashes are preserved by default. Can be overridden per
     * file via `CmsCollectionFile.preview_path_preserve_slashes`.
     */
    preview_path_preserve_slashes?: boolean;
    create?: boolean;
    delete?: boolean;
    hide?: boolean;
    editor?: {
      preview?: boolean;
      visualEditing?: boolean;
    };
    publish?: boolean;
    nested?: {
      depth: number;
      subfolders?: boolean;
      summary?: string;
    };
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
    always_fork?: boolean;
    repo?: string;
    branch?: string;
    api_root?: string;
    site_domain?: string;
    base_url?: string;
    auth_endpoint?: string;
    /** Token exchange endpoint for PKCE auth flow. Defaults to 'oauth2/token'. Mirrors the auth: block's auth_token_endpoint. */
    auth_token_endpoint?: string;
    app_id?: string;
    auth_type?: 'implicit' | 'pkce';
    cms_label_prefix?: string;
    squash_merges?: boolean;
    signoff_commits?: boolean;
    proxy_url?: string;
    use_graphql?: boolean;
    graphql_api_root?: string;
    large_media_url?: string;
    commit_messages?: {
      create?: string;
      update?: string;
      delete?: string;
      uploadMedia?: string;
      deleteMedia?: string;
      openAuthoring?: string;
    };
    preview_context?: string;
    /** git-gateway: custom git-gateway deployment URL */
    gateway_url?: string;
    /** git-gateway: custom status/components API URL */
    status_endpoint?: string;
    /** git-gateway: component name to match in status API response (default: "Git Gateway") */
    status_component_name?: string;
    /** git-gateway: URL shown to users when the git-gateway service is down */
    status_page?: string;
    /** git-gateway: identity service URL */
    identity_url?: string;
    /** git-gateway: whether to apply large media transforms in the media library */
    use_large_media_transforms_in_media_library?: boolean;
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

  export interface CmsPkceAuthConfig {
    use_oidc?: boolean;
    base_url?: string;
    auth_endpoint?: string;
    auth_token_endpoint?: string;
    app_id?: string;
    scope?: string;
    auth_token_endpoint_content_type?: string;
    email_claim?: string;
    full_name_claim?: string;
    first_name_claim?: string;
    last_name_claim?: string;
    avatar_url_claim?: string;
  }

  export interface CmsConfig {
    backend: CmsBackend;
    collections: CmsCollection[];
    locale?: string;
    site_url?: string;
    display_url?: string;
    /** Set to false to disable the collection search bar. */
    search?: boolean;
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
    issue_reports?: CmsIssueReports;
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
    local_backend?: boolean | CmsLocalBackend;
    editor?: {
      preview?: boolean;
    };
    auth?: CmsPkceAuthConfig;
  }

  export interface InitOptions {
    config: CmsConfig;
  }

  export type EditorComponentField =
    | ({
        name: string;
        label: string;
      } & {
        widget: Omit<string, 'list'>;
      })
    | {
        widget: 'list';
        /**
         * Used if widget === "list" to create a flat array
         */
        field?: EditorComponentField;
        /**
         * Used if widget === "list" to create an array of objects
         */
        fields?: EditorComponentField[];
      };

  export interface EditorComponentOptions {
    id: string;
    label: string;
    fields?: EditorComponentField[];
    pattern: RegExp;
    allow_add?: boolean;
    fromBlock: (match: RegExpMatchArray) => Record<string, unknown>;
    toBlock: (data: Record<string, unknown>) => string;
    toPreview: (data: Record<string, unknown>) => string | JSX.Element;
  }

  export interface PreviewStyleOptions {
    raw: boolean;
  }

  export interface PreviewStyle extends PreviewStyleOptions {
    value: string;
  }

  export type CmsBackendClass = new (...args: any[]) => object;

  export interface CmsRegistryBackend {
    init: (args: any) => CmsBackendClass;
  }

  export interface CmsWidgetControlProps<T = any> {
    value: T;
    field: Map<string, any>;
    onChange: (value: T) => void;
    forID: string;
    classNameWrapper: string;
  }

  export interface CmsWidgetPreviewProps<T = any> {
    value: T;
    field: Map<string, any>;
    metadata: Map<string, any>;
    getAsset: GetAssetFunction;
    entry: Map<string, any>;
    fieldsMetaData: Map<string, any>;
  }

  export interface CmsWidgetParam<T = any> {
    name: string;
    controlComponent: CmsWidgetControlProps<T>;
    previewComponent?: CmsWidgetPreviewProps<T>;
    globalStyles?: any;
  }

  export interface CmsWidget<T = any> {
    control: CmsWidgetControlProps<T>;
    preview?: CmsWidgetPreviewProps<T>;
    globalStyles?: any;
  }

  export type CmsWidgetValueSerializer = {
    serialize(value: unknown): unknown;
    deserialize(value: unknown): unknown;
  };

  export type CmsMediaLibraryOptions = Record<string, unknown>;

  export interface CmsMediaLibrary {
    name: string;
    config?: CmsMediaLibraryOptions;
  }

  export interface CmsEventListener {
    name: 'prePublish' | 'postPublish' | 'preUnpublish' | 'postUnpublish' | 'preSave' | 'postSave';
    handler: ({
      entry,
      author,
    }: {
      entry: Map<string, any>;
      author: { login: string; name: string };
    }) => any;
  }

  export type CmsEventListenerOptions = Record<string, unknown>;

  export type CmsLocalePhrases = Record<string, unknown>;

  export type Formatter = {
    fromFile(content: string): unknown;
    toFile(data: object, sortedKeys?: string[], comments?: Record<string, string>): string;
  };

  export interface CmsRegistry {
    backends: {
      [name: string]: CmsRegistryBackend;
    };
    templates: {
      [name: string]: ComponentType<any>;
    };
    previewStyles: PreviewStyle[];
    widgets: {
      [name: string]: CmsWidget;
    };
    editorComponents: Map<string, ComponentType<any>>;
    widgetValueSerializers: {
      [name: string]: CmsWidgetValueSerializer;
    };
    mediaLibraries: CmsMediaLibrary[];
    locales: {
      [name: string]: CmsLocalePhrases;
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
    widgetFor: (
      name: string,
      fields?: any,
      values?: any,
      fieldsMetaData?: any,
    ) => JSX.Element | null;
    widgetsFor: (name: string) => unknown;
    getAsset: GetAssetFunction;
    boundGetAsset: (collection: any, path: string) => GetAssetFunction;
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
    getLocale: (locale: string) => CmsLocalePhrases | undefined;
    getMediaLibrary: (name: string) => CmsMediaLibrary | undefined;
    getPreviewStyles: () => PreviewStyle[];
    getPreviewTemplate: (name: string) => ComponentType<PreviewTemplateComponentProps> | undefined;
    getWidget: (name: string) => CmsWidget | undefined;
    getWidgetValueSerializer: (widgetName: string) => CmsWidgetValueSerializer | undefined;
    init: (options?: InitOptions) => void;
    registerBackend: (name: string, backendClass: CmsBackendClass) => void;
    registerEditorComponent: (options: EditorComponentOptions) => void;
    registerRemarkPlugin: (plugin: Pluggable) => void;
    registerEventListener: (
      eventListener: CmsEventListener,
      options?: CmsEventListenerOptions,
    ) => void;
    registerLocale: (locale: string, phrases: CmsLocalePhrases) => void;
    registerMediaLibrary: (mediaLibrary: CmsMediaLibrary, options?: CmsMediaLibraryOptions) => void;
    registerPreviewStyle: (filePath: string, options?: PreviewStyleOptions) => void;
    registerPreviewTemplate: (
      name: string,
      component: ComponentType<PreviewTemplateComponentProps>,
    ) => void;
    registerWidget: (
      widget: string | CmsWidgetParam,
      control?: ComponentType<CmsWidgetControlProps> | string,
      preview?: ComponentType<CmsWidgetPreviewProps>,
    ) => void;
    registerWidgetValueSerializer: (
      widgetName: string,
      serializer: CmsWidgetValueSerializer,
    ) => void;
    resolveWidget: (name: string) => CmsWidget | undefined;
    registerCustomFormat: (name: string, extension: string, formatter: Formatter) => void;
  }

  export const DecapCmsCore: CMS;

  export default DecapCmsCore;
}
