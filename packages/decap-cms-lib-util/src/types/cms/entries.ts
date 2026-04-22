import type { CmsMediaFileMap } from "./media";

export type CmsEntry = {
  path: string;
  slug: string;
  data: unknown;
  i18n?: unknown;
  collection: string;
  mediaFiles: CmsMediaFileMap[];
  newRecord: boolean;
  author?: string;
  updatedOn?: string;
  status: string;
  meta: { path: string };
  error?: string;
  isFetching?: boolean;
  isPersisting?: boolean;
  isModification?: boolean;
};

export type CmsGroupOfEntries = {
  id: string;
  label: string;
  value: string | boolean | undefined;
  paths: Set<string>;
};

export type CmsEntryField = {
  field?: CmsEntryField;
  fields?: CmsEntryField[];
  types?: CmsEntryField[];
  widget: string;
  name: string;
  default: string | null | boolean | unknown;
  media_folder?: string;
  public_folder?: string;
  comment?: string;
  meta?: boolean;
  i18n: 'translate' | 'duplicate' | 'none';
};

