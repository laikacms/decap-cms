import type { Map, List, Set as ImmutableSet } from "immutable";
import type { StaticallyTypedRecord } from "../immutable";
import type { AssetProxy, DataFile, Filter, Group, Pages, Sort, ViewFilter, ViewGroup } from "./common";
import type { MediaFile, MediaFileMap } from "./media";

export interface UnpublishedEntryMediaFile {
  id: string;
  path: string;
}

export interface ImplementationEntry {
  data: string;
  file: { path: string; label?: string; id?: string | null; author?: string; updatedOn?: string };
}

export type EntryField = StaticallyTypedRecord<{
  field?: EntryField;
  fields?: List<EntryField>;
  types?: List<EntryField>;
  widget: string;
  name: string;
  default: string | null | boolean | List<unknown>;
  media_folder?: string;
  public_folder?: string;
  comment?: string;
  meta?: boolean;
  i18n: 'translate' | 'duplicate' | 'none';
}>;

export type ImplementationFile = {
  id?: string | null | undefined;
  label?: string;
  path: string;
};


export interface UnpublishedEntryDiff {
  id: string;
  path: string;
  newFile: boolean;
}

export interface UnpublishedEntry {
  pullRequestAuthor?: string;
  slug: string;
  collection: string;
  status: string;
  diffs: UnpublishedEntryDiff[];
  updatedAt: string;
}


export type GroupOfEntries = {
  id: string;
  label: string;
  value: string | boolean | undefined;
  paths: ImmutableSet<string>;
};

export type FileEntryObject = {
  dataFiles: DataFile[];
  assets: AssetProxy[];
};

export type FileEntry = StaticallyTypedRecord<FileEntryObject>;

export type Entities = Map<string, Entry>;

export type Entries = StaticallyTypedRecord<{
  pages: Pages;
  entities: Entities;
  sort: Sort;
  filter: Filter;
  group: Group;
  viewStyle: string;
}>;

export type EntryObject = {
  path: string;
  slug: string;
  data: any;
  i18n?: any;
  collection: string;
  mediaFiles: List<MediaFileMap>;
  newRecord: boolean;
  author?: string;
  updatedOn?: string;
  status: string;
  meta: StaticallyTypedRecord<{ path: string }>;
  error?: string;
  isFetching?: boolean;
  isPersisting?: boolean;
  isModification?: boolean;
};

export type EntryMap = StaticallyTypedRecord<EntryObject>;

export type FieldsErrors = Map<string, { type: string }[]>;

export type Entry = EntryMap | FileEntry;

export type EntryDraft = StaticallyTypedRecord<{
  entry: EntryMap;
  fieldsErrors: FieldsErrors;
  fieldsMetaData?: Map<string, Map<string, string>>;
  hasChanged: boolean;
  key: string;
  localBackup?: EntryDraft;
}>;

export type EntryFields = List<EntryField>;

export interface EntryValue {
  collection: string;
  slug: string;
  path: string;
  partial: boolean;
  raw: string;
  data: any;
  label: string | null;
  isModification: boolean | null;
  mediaFiles: MediaFile[];
  author: string;
  updatedOn: string;
  status?: string;
  meta: { path?: string };
  i18n?: {
    [locale: string]: any;
  };
}
