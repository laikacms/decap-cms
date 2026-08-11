import type { CmsAssetProxy, CmsDataFile } from './common.js';
import type { CmsMediaFileMap } from './media.js';

export type CmsEntry = {
  path: string,
  slug: string,
  data: unknown,
  i18n?: unknown,
  collection: string,
  mediaFiles: CmsMediaFileMap[],
  newRecord?: boolean,
  author?: string,
  updatedOn?: string,
  status?: string,
  meta: { path?: string | undefined },
  /**
   * Set when this entry came from a projection (a search index returning only
   * the fields it stores) rather than a full load. Such an entry may be
   * displayed but never edited or written back; see `selectCompleteEntry`.
   */
  projected?: boolean,
  error?: string,
  isFetching?: boolean,
  isPersisting?: boolean,
  isModification?: boolean | null,
};

export type CmsGroupOfEntries = {
  id: string,
  label: string,
  value: string | boolean | undefined,
  paths: Set<string>,
};

export type CmsEntryField = {
  field?: CmsEntryField,
  fields?: CmsEntryField[],
  types?: CmsEntryField[],
  widget: string,
  name: string,
  default: string | null | boolean | unknown,
  media_folder?: string,
  public_folder?: string,
  comment?: string,
  meta?: boolean,
  i18n: 'translate' | 'duplicate' | 'none',
  [key: string]: unknown,
};

export type CmsEntryFields = CmsEntryField[];

export type CmsImplementationFile = {
  id?: string | null | undefined,
  label?: string | undefined,
  path: string,
};

export type CmsFileEntry = {
  dataFiles: CmsDataFile[],
  assets: CmsAssetProxy[],
};

export type CmsUnpublishedEntryMediaFile = {
  id: string,
  path: string,
};
