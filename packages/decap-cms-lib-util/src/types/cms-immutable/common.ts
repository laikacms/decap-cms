import type { StaticallyTypedRecord } from "../immutable";
import type { List, OrderedMap, Map } from "immutable";
import type { EntryValue } from "./entries";

export type AssetProxy = {
  path: string;
  url?: string;
  fileObj?: File;
  toBase64: () => Promise<string>;
};

export type DataFile = {
  path: string;
  slug: string;
  raw: string;
  newPath?: string;
};

export type PersistOptions = {
  newEntry?: boolean;
  commitMessage: string;
  collectionName?: string;
  useWorkflow?: boolean;
  unpublished?: boolean;
  status?: string;
};

export type DeleteOptions = Record<string, unknown>;

export type Credentials = { token: string | Record<string, unknown>; refresh_token?: string };

export type User = Credentials & {
  backendName?: string;
  login?: string;
  name: string;
  useOpenAuthoring?: boolean;
};

export type DisplayURLObject = { id: string; path: string }

export type DisplayURL = DisplayURLObject | string;


export interface ViewFilter {
  label: string;
  field: string;
  pattern: string;
  id: string;
}

export interface ViewGroup {
  label: string;
  field: string;
  pattern: string;
  id: string;
}

export interface SortableField {
  field: string;
  label?: string;
  default_sort?: boolean | 'asc' | 'desc';
}

export type SlugConfig = StaticallyTypedRecord<{
  encoding: string;
  clean_accents: boolean;
  sanitize_replacement: string;
}>;


export type Page = StaticallyTypedRecord<{ isFetching: boolean; page: number; ids: List<string> }>;

export type Pages = Map<string, Page>;

export enum SortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
  None = 'None',
}

export type SortObject = { key: string; direction: SortDirection };

export type SortMap = OrderedMap<string, StaticallyTypedRecord<SortObject>>;

export type Sort = Map<string, SortMap>;

export type FilterMap = StaticallyTypedRecord<ViewFilter & { active: boolean }>;

export type GroupMap = StaticallyTypedRecord<ViewGroup & { active: boolean }>;

export type Filter = Map<string, Map<string, FilterMap>>; // collection.field.active

export type Group = Map<string, Map<string, GroupMap>>; // collection.field.active

export type FilterRule = StaticallyTypedRecord<{
  value: string;
  field: string;
}>;

export type Action<T extends string = string> = {
  type: T;
}

export type GetAssetFunction = (asset: string) => {
  url: string;
  path: string;
  field?: any;
  fileObj: File;
};

export type QueryRequest = {
  id: string;
  expires: Date;
  queryResponse: Promise<QueryResponse>;
}

export type QueryResponse = {
  hits: EntryValue[];
  query: string;
};