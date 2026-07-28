import type { CmsDisplayURL } from './common.js';
import type { CmsEntryField } from './entries.js';

/**
 * Opt-in client-side raster image optimization applied at upload time,
 * before the file is handed to the backend. Resolution order (most to
 * least specific): field-level `media_library.config.image_optimization`,
 * then the global `media_library.config.image_optimization`.
 */
export type CmsImageOptimizationConfig = {
  /** Master switch; defaults to `false` (opt-in). */
  enabled?: boolean | undefined,
  /** Max output width in px; the image is scaled down to fit, preserving aspect ratio. */
  max_width?: number | undefined,
  /** Max output height in px; the image is scaled down to fit, preserving aspect ratio. */
  max_height?: number | undefined,
  /** Output format. `'original'` keeps the source format but still resizes. */
  format?: 'webp' | 'jpeg' | 'png' | 'original' | undefined,
  /** Encoder quality in the 0-1 range; ignored for lossless formats like png. */
  quality?: number | undefined,
};

export type CmsMediaLibraryOptions = {
  multiple?: boolean | undefined,
  max_file_size?: number | undefined,
  image_optimization?: CmsImageOptimizationConfig | undefined,
};

export interface CmsMediaLibrary {
  name: string;
  config?: CmsMediaLibraryOptions;
  allow_multiple?: boolean | undefined;
}

export interface CmsBackendMediaFile {
  name: string;
  id: string;
  size?: number;
  displayURL?: CmsDisplayURL;
  path: string;
  draft?: boolean;
  url?: string;
  file?: File;
  field?: CmsEntryField;
  /**
   * Set when this entry represents a folder rather than an asset. Only
   * populated by backends that already list directory entries alongside
   * files (currently gitea/forgejo); other backends simply never set it, so
   * consumers should treat its absence the same as `false`.
   */
  isDirectory?: boolean;
}

export type CmsMediaFile = CmsBackendMediaFile & { key?: string };

export type CmsMediaFileMap = CmsMediaFile;

export type CmsImplementationMediaFile = {
  name: string,
  id: string,
  size?: number,
  displayURL?: CmsDisplayURL,
  path: string,
  draft?: boolean,
  url?: string,
  file?: File,
  /** See `CmsBackendMediaFile.isDirectory`. */
  isDirectory?: boolean,
};

/**
 * What a backend's paginated media surface supports. Returned by
 * `CmsImplementation.getMediaCapabilities`; only consulted when the backend
 * also implements `getMediaPage`.
 */
export type CmsMediaCapabilities = {
  /** Media can be listed page by page via `getMediaPage`. */
  pagination: boolean,
  /**
   * `getMediaPage({ query })` applies the search server-side. When false the
   * media library falls back to client-side filtering of loaded pages.
   */
  dynamicSearch: boolean,
};

export type CmsGetMediaPageOptions = {
  /** Opaque continuation from the previous page's `nextCursor`; omit for the first page. */
  cursor?: string,
  /** Server-side search term; only passed when capabilities declare dynamicSearch. */
  query?: string,
  /** Requested page size; backends may return slightly more or fewer items. */
  perPage?: number,
};

export type CmsMediaPage = {
  files: CmsImplementationMediaFile[],
  /** Continuation for the next page; absent when the listing is exhausted. */
  nextCursor?: string,
};

export interface CmsMediaLibraryInstance {
  show: (args: {
    id?: string,
    value?: string,
    config: Record<string, unknown>,
    allowMultiple?: boolean,
    imagesOnly?: boolean,
  }) => void;
  hide: () => void;
  onClearControl: (args: { id: string }) => void;
  onRemoveControl: (args: { id: string }) => void;
  enableStandalone: () => boolean;
}
