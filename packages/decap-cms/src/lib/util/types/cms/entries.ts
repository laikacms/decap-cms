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

export type CmsEntryValue = {
  collection: string,
  slug: string,
  path: string,
  partial: boolean,
  raw: string,
  data: unknown,
  label: string | null,
  isModification: boolean | null,
  mediaFiles: CmsMediaFileMap[],
  author: string,
  updatedOn: string,
  status?: string,
  meta: { path?: string | undefined },
  i18n?: Record<string, unknown>,
};

export type CmsImplementationEntry = {
  data: string,
  file: {
    path: string,
    label?: string | undefined,
    id?: string | null | undefined,
    author?: string | undefined,
    updatedOn?: string | undefined,
  },
};

export type CmsImplementationFile = {
  id?: string | null | undefined,
  label?: string | undefined,
  path: string,
};

export type CmsFileEntry = {
  dataFiles: CmsDataFile[],
  assets: CmsAssetProxy[],
};

export type CmsUnpublishedEntryDiff = {
  id: string,
  path: string,
  newFile: boolean,
};

export type CmsUnpublishedEntryMediaFile = {
  id: string,
  path: string,
};

export type CmsUnpublishedEntry = {
  pullRequestAuthor?: string,
  slug: string,
  collection: string,
  status: string,
  diffs: CmsUnpublishedEntryDiff[],
  updatedAt: string,
};
