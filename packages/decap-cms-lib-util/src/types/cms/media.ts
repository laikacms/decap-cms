import type { CmsDisplayURL } from "./common";
import type { CmsEntryField } from "./entries";

export type CmsMediaLibraryOptions = unknown; // TODO: type properly

export interface CmsMediaLibrary {
  name: string;
  config?: CmsMediaLibraryOptions;
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