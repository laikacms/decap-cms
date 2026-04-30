import type { CmsDisplayURL } from './common.js';
import type { CmsEntryField } from './entries.js';

export type CmsMediaLibraryOptions = {
  multiple?: boolean | undefined;
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
  name: string;
  id: string;
  size?: number;
  displayURL?: CmsDisplayURL;
  path: string;
  draft?: boolean;
  url?: string;
  file?: File;
};

export interface CmsMediaLibraryInstance {
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
