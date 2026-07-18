import type { CmsDisplayURL } from './common.js';
import type { CmsEntryField } from './entries.js';

export type CmsMediaLibraryOptions = {
  multiple?: boolean | undefined,
  max_file_size?: number | undefined,
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
