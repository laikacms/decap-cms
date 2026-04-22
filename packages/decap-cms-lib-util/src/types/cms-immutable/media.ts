import type { StaticallyTypedRecord } from "../immutable";
import type { DisplayURL } from "./common";
import type { EntryField } from "./entries";

export interface ImplementationMediaFile {
  name: string;
  id: string;
  size?: number;
  displayURL?: DisplayURL;
  path: string;
  draft?: boolean;
  url?: string;
  file?: File;
}

export interface BackendMediaFile {
  name: string;
  id: string;
  size?: number;
  displayURL?: DisplayURL;
  path: string;
  draft?: boolean;
  url?: string;
  file?: File;
  field?: EntryField;
}

export type MediaFile = BackendMediaFile & { key?: string };

export type MediaFileMap = StaticallyTypedRecord<MediaFile>;

export type DisplayURLStateObject = {
  isFetching: boolean;
  url?: string;
  err?: Error;
};


export interface MediaLibraryInstance {
  show: (args: {
    id?: string;
    value?: string;
    config: Map<string, unknown>;
    allowMultiple?: boolean;
    imagesOnly?: boolean;
  }) => void;
  hide: () => void;
  onClearControl: (args: { id: string }) => void;
  onRemoveControl: (args: { id: string }) => void;
  enableStandalone: () => boolean;
}

export type DisplayURLState = StaticallyTypedRecord<DisplayURLStateObject>;

interface DisplayURLsObject {
  [id: string]: DisplayURLState;
}

export type MediaLibraryOptions = unknown; // TODO: type properly

export type MediaLibrary = StaticallyTypedRecord<{
  externalLibrary?: MediaLibraryInstance;
  files: MediaFile[];
  displayURLs: StaticallyTypedRecord<DisplayURLsObject>;
  isLoading: boolean;
  isVisible: boolean;
  showMediaButton: boolean;
  controlMedia: Map<string, string>;
  controlID?: string;
  page?: number;
  config: Map<string, unknown>;
  field?: EntryField;
  value?: string | string[];
  replaceIndex?: number | boolean;
  forImage?: boolean;
  canInsert?: boolean;
  privateUpload?: boolean;
  isPersisting?: boolean;
  isDeleting?: boolean;
  hasNextPage?: boolean;
  isPaginating?: boolean;
  dynamicSearch?: boolean;
  dynamicSearchActive?: boolean;
  dynamicSearchQuery?: string;
}>;
