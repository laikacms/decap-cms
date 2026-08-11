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
  /** Maximum length (in characters) of a generated slug segment. Defaults to 100, hard-capped at 255. */
  max_length?: number;
}

export enum CmsSortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
  None = 'None',
}

export type CmsSortObject = { key: string, direction: CmsSortDirection };

export interface CmsViewGroup {
  label: string;
  field: string;
  pattern?: string;
  id: string;
}

export interface CmsViewFilter {
  label: string;
  field: string;
  pattern: string | boolean;
  id: string;
}

export type CmsFilterRule = {
  value: string,
  field: string,
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
    entry: Record<string, unknown>,
    author: { login: string, name: string },
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
  fromFile(content: string): unknown,
  toFile(data: object, sortedKeys?: string[], comments?: Record<string, string>): string,
};

export type CmsFormatter = {
  extension: string,
  formatter: CmsFormatterFunctions,
};

/**
 * An entry codec (`src/entry-codecs/{yaml,toml,json}`): the encoding of a
 * whole entry file, registered via `CMS.registerEntryCodec`. Distinct from
 * richtext format packs (`registerRichtextFormat`), which serialize a single
 * richtext field's body. Nothing is registered by default: the fat `/app` +
 * `/laika-app` entries register all three built-ins; `/bare` consumers
 * register only the codecs their collections use (laika-backend apps
 * typically just JSON).
 */
export type CmsEntryCodecDelimiter = string | [string, string];

export type CmsEntryCodec = {
  /** Canonical format name for `collection.format` (e.g. 'yaml'). */
  name: string,
  /** Additional accepted `collection.format` names (e.g. ['yml']). */
  aliases?: string[],
  /** File extensions whose format is inferred to this codec (e.g. ['yml', 'yaml']). */
  fileExtensions: string[],
  /** Extension used when creating new files (e.g. 'yml'). */
  defaultExtension: string,
  formatter: CmsFormatterFunctions,
  /**
   * Per-format-name formatter resolution for codecs serving several format
   * names (the markdown codec serves 'frontmatter', 'yaml-frontmatter', ...,
   * each honoring `frontmatter_delimiter`). Falls back to `formatter`.
   */
  getFormatter?(
    name: string,
    opts?: { customDelimiter?: CmsEntryCodecDelimiter | undefined },
  ): CmsFormatterFunctions,
  /** Format names (of this codec) that accept `frontmatter_delimiter`. */
  frontmatterFormats?: string[],
  /**
   * CMS-config-file parser (`config.yml` and friends), when it needs options
   * beyond entry parsing (the yaml codec enables merge keys and unlimited
   * aliases for configs only). Falls back to `formatter.fromFile`.
   */
  parseConfig?(text: string): unknown,
};

/**
 * A frontmatter language configuration for `createMarkdownEntryCodec`: which
 * entry codec parses the metadata block, and the markdown-level rules for
 * embedding it (fence delimiters, plus optional parse/stringify overrides for
 * languages whose fences interact with their syntax — JSON's braces ARE its
 * fences). These rules belong to the markdown codec, not to the entry codec
 * itself; each codec module exports a ready-made config
 * (`yamlFrontmatterCodec`, `tomlFrontmatterCodec`, `jsonFrontmatterCodec`).
 */
export type CmsFrontmatterCodec = {
  codec: CmsEntryCodec,
  delimiters: [string, string],
  /** Metadata-block parser; defaults to `codec.formatter.fromFile`. */
  parse?(input: string): unknown,
  /**
   * Metadata-block serializer; defaults to `codec.formatter.toFile` with a
   * single trailing newline stripped (it would render as a blank line before
   * the closing fence).
   */
  stringify?(
    metadata: object,
    opts?: { sortedKeys?: string[] | undefined, comments?: Record<string, string> | undefined },
  ): string,
};

export interface CmsEventHandler {
  handler: (...args: unknown[]) => unknown;
  options: Record<string, unknown>;
}

export type CmsDisplayURLObject = { id: string, path: string };

export type CmsDisplayURL = CmsDisplayURLObject | string;

export interface CmsSortableField {
  field: string;
  label?: string;
  default_sort?: boolean | 'asc' | 'desc';
}

export type CmsCredentials = {
  token: string | Record<string, unknown>,
  refresh_token?: string | undefined,
};

// Assembled from a provider's user payload, where any of these may simply not
// be reported, so the optionals carry an explicit `undefined` rather than
// forcing every backend to build the object key by key.
export type CmsUser = CmsCredentials & {
  backendName?: string | undefined,
  login?: string | undefined,
  email?: string | undefined,
  name: string,
  avatar_url?: string | undefined,
  scopes?: string[] | undefined,
  /** Name of a config-defined role (`config.roles`) granting additional scopes. */
  role?: string | undefined,
  useOpenAuthoring?: boolean | undefined,
};

export type CmsAssetProxy = {
  path: string,
  url?: string | undefined,
  fileObj?: File | undefined,
  toBase64: () => Promise<string>,
  sha?: string | null | undefined, // For git-based backends
};

export type CmsDataFile = {
  path: string,
  slug: string,
  raw: string,
  // Set only when the entry moved; carried through as-is from the caller.
  newPath?: string | undefined,
  sha?: string | null | undefined, // For git-based backends
};

export type CmsPersistOptions = {
  newEntry?: boolean | undefined,
  commitMessage: string,
  collectionName?: string | undefined,
  useWorkflow?: boolean | undefined,
  unpublished?: boolean | undefined,
  status?: string | undefined,
  hasSubfolders?: boolean | undefined,
};

export type CmsDeleteOptions = Record<string, unknown>;

export type CmsGetAssetFunction = (asset: string) => {
  url: string,
  path: string,
  field?: unknown,
  fileObj: File,
};
