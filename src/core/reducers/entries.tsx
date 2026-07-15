import { produce } from 'immer';
import { groupBy, once, orderBy, set, sortBy, trim } from 'lodash-es';

import { isAbsolutePath, basename, dirname, join } from '@/lib/util/index';
import { stringTemplate } from '@/lib/widgets/index';
import { CmsSortDirection as SortDirection } from '@/lib/util/index';
import { folderFormatter } from '@/core/lib/formatters';
import { selectSortDataPath } from './collections';
import { SEARCH_ENTRIES_SUCCESS } from '@/core/actions/search';
import {
  ENTRY_REQUEST,
  ENTRY_SUCCESS,
  ENTRY_FAILURE,
  ENTRIES_REQUEST,
  ENTRIES_SUCCESS,
  ENTRIES_FAILURE,
  ENTRY_DELETE_SUCCESS,
  SORT_ENTRIES_REQUEST,
  SORT_ENTRIES_SUCCESS,
  SORT_ENTRIES_FAILURE,
  FILTER_ENTRIES_REQUEST,
  FILTER_ENTRIES_SUCCESS,
  FILTER_ENTRIES_FAILURE,
  GROUP_ENTRIES_REQUEST,
  GROUP_ENTRIES_SUCCESS,
  GROUP_ENTRIES_FAILURE,
  CHANGE_VIEW_STYLE,
} from '@/core/actions/entries';
import { VIEW_STYLE_LIST } from '@/core/constants/collectionViews';
import { joinUrlPath } from '@/core/lib/urlHelper';

import type { AnyAction } from 'redux';
import type {
  CmsConfig,
  CmsEntry,
  CmsEntryField,
  CmsCollectionState,
  CmsCollectionFileState,
  CmsGroupOfEntries,
  CmsSortObject,
  CmsViewFilter,
  CmsViewGroup,
} from '@/lib/util/index';

type SortMap = Record<string, CmsSortObject>;
type Sort = Record<string, SortMap>;
type FilterMap = CmsViewFilter & { active?: boolean };
type Filter = Record<string, Record<string, FilterMap>>;
type GroupMap = CmsViewGroup & { active?: boolean };
type Group = Record<string, Record<string, GroupMap>>;

export type EntryPage = { isFetching: boolean; page?: number; ids: string[] };

export type Entries = {
  entities: Record<string, CmsEntry>;
  pages: Record<string, EntryPage>;
  sort: Sort;
  filter: Filter;
  group: Group;
  viewStyle: string;
};

type EntryDraft = {
  entry: CmsEntry;
  fieldsMetaData?: Record<string, unknown>;
  fieldsErrors?: Record<string, unknown>;
  hasChanged: boolean;
  key: string;
};

type EntryRequestPayload = { collection: string; slug: string };
type EntrySuccessPayload = { collection: string; entry: CmsEntry };
type EntriesSuccessPayload = {
  collection: string;
  entries: CmsEntry[];
  append: boolean;
  page: number;
};
type EntryFailurePayload = { collection: string; slug: string; error: Error };
type EntryDeletePayload = { collectionName: string; entrySlug: string };
type EntriesRequestPayload = { collection: string };
type EntriesSortRequestPayload = { collection: string; key: string; direction: SortDirection };
type EntriesSortFailurePayload = { collection: string; key: string };
type EntriesFilterRequestPayload = { collection: string; filter: FilterMap };
type EntriesFilterFailurePayload = { collection: string; filter: FilterMap };
type EntriesGroupRequestPayload = { collection: string; group: GroupMap };
type EntriesGroupFailurePayload = { collection: string; group: GroupMap };
type ChangeViewStylePayload = { style: string };
type EntriesAction = AnyAction;

const { keyToPathArray } = stringTemplate;

const storageSortKey = 'decap-cms.entries.sort';
const viewStyleKey = 'decap-cms.entries.viewStyle';

function normalizeDoubleSlashes(path: string) {
  if (!path) return path;
  return path.replace(/([^:]\/)\/+/g, '$1');
}

type StorageSortObject = CmsSortObject & { index: number };
type StorageSort = { [collection: string]: { [key: string]: StorageSortObject } };

const loadSort = once((): Sort => {
  const sortString = localStorage.getItem(storageSortKey);
  if (sortString) {
    try {
      const sort: StorageSort = JSON.parse(sortString);
      const map: Sort = {};
      Object.entries(sort).forEach(([collection, collSort]) => {
        const orderedMap: SortMap = {};
        sortBy(Object.values(collSort), ['index']).forEach(value => {
          const { key, direction } = value;
          orderedMap[key] = { key, direction };
        });
        map[collection] = orderedMap;
      });
      return map;
    } catch (e) {
      return {};
    }
  }
  return {};
});

function persistSort(sort: Sort | undefined) {
  if (sort) {
    const storageSort: StorageSort = {};
    Object.entries(sort).forEach(([collection, sortMap]) => {
      Object.values(sortMap).forEach((value, index) => {
        set(storageSort, [collection, value.key], { ...value, index });
      });
    });
    localStorage.setItem(storageSortKey, JSON.stringify(storageSort));
  } else {
    localStorage.removeItem(storageSortKey);
  }
}

const loadViewStyle = once((): string => {
  const viewStyle = localStorage.getItem(viewStyleKey);
  if (viewStyle) return viewStyle;
  localStorage.setItem(viewStyleKey, VIEW_STYLE_LIST);
  return VIEW_STYLE_LIST;
});

function persistViewStyle(viewStyle: string | undefined) {
  if (viewStyle) {
    localStorage.setItem(viewStyleKey, viewStyle);
  } else {
    localStorage.removeItem(viewStyleKey);
  }
}

const defaultState: Entries = {
  entities: {},
  pages: {},
  sort: loadSort(),
  filter: {},
  group: {},
  viewStyle: loadViewStyle(),
};

function getNestedValue(obj: any, path: string[]): any {
  return path.reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
}

const entries = produce((state: Entries, action: EntriesAction) => {
  switch (action.type) {
    case ENTRY_REQUEST: {
      const payload = action.payload as EntryRequestPayload;
      const key = `${payload.collection}.${payload.slug}`;
      state.entities[key] = { ...(state.entities[key] ?? {}), isFetching: true } as CmsEntry;
      break;
    }

    case ENTRY_SUCCESS: {
      const payload = action.payload as EntrySuccessPayload;
      const { collection, entry } = payload;
      const key = `${collection}.${entry.slug}`;
      state.entities[key] = { ...entry, isFetching: false };
      const ids = state.pages[collection]?.ids ?? [];
      if (!ids.includes(entry.slug)) {
        state.pages[collection] = {
          ...(state.pages[collection] ?? { isFetching: false, page: 0, ids: [] }),
          ids: [entry.slug, ...ids],
        };
      }
      break;
    }

    case ENTRIES_REQUEST: {
      const payload = action.payload as EntriesRequestPayload;
      state.pages[payload.collection] = {
        ...(state.pages[payload.collection] ?? { isFetching: false, page: 0, ids: [] }),
        isFetching: true,
      };
      break;
    }

    case ENTRIES_SUCCESS: {
      const payload = action.payload as EntriesSuccessPayload;
      const { collection, entries: loadedEntries, append, page } = payload;
      loadedEntries.forEach(entry => {
        state.entities[`${collection}.${entry.slug}`] = { ...entry, isFetching: false };
      });
      const newIds = loadedEntries.map(entry => entry.slug);
      const existingIds = append ? (state.pages[collection]?.ids ?? []) : [];
      state.pages[collection] = { page, ids: [...existingIds, ...newIds], isFetching: false };
      break;
    }

    case ENTRIES_FAILURE:
      if (state.pages[(action as any).meta.collection]) {
        state.pages[(action as any).meta.collection].isFetching = false;
      }
      break;

    case ENTRY_FAILURE: {
      const payload = action.payload as EntryFailurePayload;
      const key = `${payload.collection}.${payload.slug}`;
      state.entities[key] = {
        ...(state.entities[key] ?? {}),
        isFetching: false,
        error: payload.error.message,
      } as CmsEntry;
      break;
    }

    case SEARCH_ENTRIES_SUCCESS: {
      const payload = action.payload as EntriesSuccessPayload;
      payload.entries.forEach(entry => {
        state.entities[`${entry.collection}.${entry.slug}`] = { ...entry, isFetching: false };
      });
      break;
    }

    case ENTRY_DELETE_SUCCESS: {
      const payload = action.payload as EntryDeletePayload;
      delete state.entities[`${payload.collectionName}.${payload.entrySlug}`];
      const page = state.pages[payload.collectionName];
      if (page) {
        page.ids = page.ids.filter(id => id !== payload.entrySlug);
      }
      break;
    }

    case SORT_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesSortRequestPayload;
      const { collection, key, direction } = payload;
      state.sort[collection] = { [key]: { key, direction } } as SortMap;
      if (!state.pages[collection])
        state.pages[collection] = { isFetching: false, page: 0, ids: [] };
      state.pages[collection].isFetching = true;
      delete (state.pages[collection] as any).page;
      persistSort(state.sort);
      break;
    }

    case GROUP_ENTRIES_SUCCESS:
    case FILTER_ENTRIES_SUCCESS:
    case SORT_ENTRIES_SUCCESS: {
      const payload = action.payload as { collection: string; entries: CmsEntry[] };
      const { collection, entries: loadedEntries } = payload;
      loadedEntries.forEach(entry => {
        state.entities[`${entry.collection}.${entry.slug}`] = { ...entry, isFetching: false };
      });
      if (state.pages[collection]) state.pages[collection].isFetching = false;
      const ids = loadedEntries.map(entry => entry.slug);
      state.pages[collection] = { page: 1, ids, isFetching: false };
      break;
    }

    case SORT_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesSortFailurePayload;
      const { collection, key } = payload;
      if (state.sort[collection]) delete state.sort[collection][key];
      if (state.pages[collection]) state.pages[collection].isFetching = false;
      persistSort(state.sort);
      break;
    }

    case FILTER_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesFilterRequestPayload;
      const { collection, filter } = payload;
      state.filter[collection] = state.filter[collection] ?? {};
      const current: FilterMap = state.filter[collection][filter.id] ?? (filter as FilterMap);
      state.filter[collection][current.id] = { ...current, active: !current.active };
      break;
    }

    case FILTER_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesFilterFailurePayload;
      const { collection, filter } = payload;
      if (state.filter[collection]) delete state.filter[collection][filter.id];
      if (state.pages[collection]) state.pages[collection].isFetching = false;
      break;
    }

    case GROUP_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesGroupRequestPayload;
      const { collection, group } = payload;
      state.group[collection] = state.group[collection] ?? {};
      const current: GroupMap = state.group[collection][group.id] ?? (group as GroupMap);
      state.group[collection] = {};
      state.group[collection][current.id] = { ...current, active: !current.active };
      break;
    }

    case GROUP_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesGroupFailurePayload;
      const { collection, group } = payload;
      if (state.group[collection]) delete state.group[collection][group.id];
      if (state.pages[collection]) state.pages[collection].isFetching = false;
      break;
    }

    case CHANGE_VIEW_STYLE: {
      const payload = action.payload as unknown as ChangeViewStylePayload;
      state.viewStyle = payload.style;
      persistViewStyle(state.viewStyle);
      break;
    }
  }
}, defaultState);

export function selectEntriesSort(entries: Entries, collection: string) {
  return entries.sort?.[collection];
}

export function selectEntriesFilter(entries: Entries, collection: string) {
  return entries.filter?.[collection] ?? {};
}

export function selectEntriesGroup(entries: Entries, collection: string) {
  return entries.group?.[collection] ?? {};
}

export function selectEntriesGroupField(entries: Entries, collection: string) {
  const groups = selectEntriesGroup(entries, collection);
  return Object.values(groups).find(v => v?.active === true);
}

export function selectEntriesSortFields(entries: Entries, collection: string) {
  const sort = selectEntriesSort(entries, collection);
  return Object.values(sort ?? {}).filter(v => v?.direction !== SortDirection.None);
}

export function selectEntriesFilterFields(entries: Entries, collection: string) {
  const filter = selectEntriesFilter(entries, collection);
  return Object.values(filter).filter(v => v?.active === true);
}

export function selectViewStyle(entries: Entries) {
  return entries.viewStyle;
}

export function selectEntry(
  state: Entries,
  collection: string,
  slug: string,
): CmsEntry | undefined {
  return state.entities[`${collection}.${slug}`];
}

export function selectPublishedSlugs(state: Entries, collection: string): string[] | undefined {
  return state.pages[collection]?.ids;
}

function getPublishedEntries(state: Entries, collectionName: string): CmsEntry[] | undefined {
  const slugs = selectPublishedSlugs(state, collectionName);
  if (!slugs) return undefined;
  return slugs
    .map(slug => selectEntry(state, collectionName, slug))
    .filter((e): e is CmsEntry => e !== undefined);
}

export function selectEntries(state: Entries, collection: CmsCollectionState) {
  const collectionName = collection.name;
  let entries = getPublishedEntries(state, collectionName);

  if (!entries) return [] as CmsEntry[];

  const sortFields = selectEntriesSortFields(state, collectionName);
  if (sortFields && sortFields.length > 0) {
    const keys = sortFields.map(v => selectSortDataPath(collection, v.key));
    const orders = sortFields.map(v => (v.direction === SortDirection.Ascending ? 'asc' : 'desc'));
    entries = orderBy(entries, keys, orders);
  }

  const filters = selectEntriesFilterFields(state, collectionName);
  if (filters && filters.length > 0) {
    entries = entries.filter(e => {
      return filters.every(f => {
        const pattern = f.pattern;
        const field = f.field;
        const data = e?.data ?? {};
        const toMatch = getNestedValue(data, keyToPathArray(field));
        return toMatch !== undefined && new RegExp(String(pattern)).test(String(toMatch));
      });
    });
  }

  return entries;
}

function getGroup(entry: CmsEntry, selectedGroup: GroupMap) {
  const { label, field } = selectedGroup;
  const fieldData = getNestedValue(entry.data, keyToPathArray(field));
  if (fieldData === undefined) {
    return { id: 'missing_value', label, value: fieldData };
  }
  const dataAsString = String(fieldData);
  if (selectedGroup.pattern) {
    const pattern = selectedGroup.pattern;
    let value = '';
    try {
      const regex = new RegExp(pattern);
      const matched = dataAsString.match(regex);
      if (matched) value = matched[0];
    } catch (e) {
      console.warn(`Invalid view group pattern '${pattern}' for field '${field}'`, e);
    }
    return { id: `${label}${value}`, label, value };
  }
  return {
    id: `${label}${fieldData}`,
    label,
    value: typeof fieldData === 'boolean' ? fieldData : dataAsString,
  };
}

export function selectGroups(state: Entries, collection: CmsCollectionState): CmsGroupOfEntries[] {
  const collectionName = collection.name;
  const entries = getPublishedEntries(state, collectionName);
  if (!entries) return [];

  const selectedGroup = selectEntriesGroupField(state, collectionName);
  if (selectedGroup === undefined) return [];

  let groups: Record<string, { id: string; label: string; value: string | boolean | undefined }> =
    {};
  const groupedEntries = groupBy(entries, entry => {
    const group = getGroup(entry, selectedGroup);
    groups = { ...groups, [group.id]: group };
    return group.id;
  });

  return Object.entries(groupedEntries).map(([id, entries]) => ({
    ...groups[id],
    paths: new Set(entries.map(entry => entry.path)),
  }));
}

export function selectEntryByPath(state: Entries, collection: string, path: string) {
  const slugs = selectPublishedSlugs(state, collection);
  if (!slugs) return undefined;
  return slugs.map(slug => selectEntry(state, collection, slug)).find(e => e?.path === path);
}

export function selectEntriesLoaded(state: Entries, collection: string) {
  return !!state.pages[collection];
}

export function selectIsFetching(state: Entries, collection: string): boolean {
  return state.pages[collection]?.isFetching ?? false;
}

function getFileField(collectionFiles: CmsCollectionFileState[], slug: string | undefined) {
  return collectionFiles.find(f => f?.name === slug);
}

function hasCustomFolder(
  folderKey: 'media_folder' | 'public_folder',
  collection: CmsCollectionState | null,
  slug: string | undefined,
  field: CmsEntryField | undefined,
): boolean {
  if (!collection) return false;
  if (field && field[folderKey] != null) return true;
  if (collection.files) {
    const file = getFileField(collection.files, slug);
    if (file && file[folderKey] != null) return true;
  }
  if (collection[folderKey] != null) return true;
  return false;
}

function traverseFields(
  folderKey: 'media_folder' | 'public_folder',
  config: CmsConfig,
  collection: CmsCollectionState,
  entryMap: CmsEntry | undefined,
  field: CmsEntryField,
  fields: CmsEntryField[],
  currentFolder: string,
): string | null {
  const matchedField = fields.find(f => f === field);
  if (matchedField) {
    return folderFormatter(
      matchedField[folderKey] != null ? (matchedField[folderKey] as string) : `{{${folderKey}}}`,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );
  }
  for (let f of fields) {
    if (f[folderKey] == null) f = { ...f, [folderKey]: `{{${folderKey}}}` };
    const folder = folderFormatter(
      f[folderKey] as string,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );
    let fieldFolder: string | null = null;
    if (f.fields) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        f.fields as CmsEntryField[],
        folder,
      );
    } else if (f.field) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        [f.field as CmsEntryField],
        folder,
      );
    } else if (f.types) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        f.types as CmsEntryField[],
        folder,
      );
    }
    if (fieldFolder != null) return fieldFolder;
  }
  return null;
}

function evaluateFolder(
  folderKey: 'media_folder' | 'public_folder',
  config: CmsConfig,
  collection: CmsCollectionState,
  entryMap: CmsEntry | undefined,
  field: CmsEntryField | undefined,
): string {
  let currentFolder = config[folderKey]!;
  if (collection[folderKey] == null)
    collection = { ...collection, [folderKey]: `{{${folderKey}}}` };

  if (collection.files) {
    currentFolder = folderFormatter(
      collection[folderKey] as string,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );
    let file = getFileField(collection.files, entryMap?.slug);
    if (file) {
      if (file[folderKey] == null) file = { ...file, [folderKey]: `{{${folderKey}}}` };
      currentFolder = folderFormatter(
        file[folderKey] as string,
        entryMap,
        collection,
        currentFolder,
        folderKey,
        config.slug,
      );
      if (field) {
        const fieldFolder = traverseFields(
          folderKey,
          config,
          collection,
          entryMap,
          field,
          (file.fields ?? []) as CmsEntryField[],
          currentFolder,
        );
        if (fieldFolder !== null) currentFolder = fieldFolder;
      }
    }
  } else {
    currentFolder = folderFormatter(
      collection[folderKey] as string,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );
    if (field) {
      const fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        (collection.fields ?? []) as CmsEntryField[],
        currentFolder,
      );
      if (fieldFolder !== null) currentFolder = fieldFolder;
    }
  }
  return currentFolder;
}

export function selectMediaFolder(
  config: CmsConfig,
  collection: CmsCollectionState | null,
  entryMap: CmsEntry | undefined,
  field: CmsEntryField | undefined,
) {
  const name = 'media_folder';
  let mediaFolder = config[name];
  const customFolder = hasCustomFolder(name, collection, entryMap?.slug, field);
  if (customFolder) {
    const folder = evaluateFolder(name, config, collection!, entryMap, field);
    if (folder.startsWith('/')) {
      mediaFolder = join(folder);
    } else {
      const entryPath = entryMap?.path;
      mediaFolder = entryPath ? join(dirname(entryPath), folder) : (collection!.folder as string);
    }
  }
  return trim(mediaFolder, '/');
}

export function selectMediaFilePath(
  config: CmsConfig,
  collection: CmsCollectionState | null,
  entryMap: CmsEntry | undefined,
  mediaPath: string,
  field: CmsEntryField | undefined,
) {
  if (isAbsolutePath(mediaPath)) return mediaPath;
  const mediaFolder = selectMediaFolder(config, collection, entryMap, field);
  return join(mediaFolder, basename(mediaPath));
}

export function selectMediaFilePublicPath(
  config: CmsConfig,
  collection: CmsCollectionState | null,
  mediaPath: string,
  entryMap: CmsEntry | undefined,
  field: CmsEntryField | undefined,
) {
  if (isAbsolutePath(mediaPath)) return mediaPath;
  const name = 'public_folder';
  let publicFolder = normalizeDoubleSlashes(config[name]!);
  const customFolder = hasCustomFolder(name, collection, entryMap?.slug, field);
  if (customFolder) {
    publicFolder = normalizeDoubleSlashes(
      evaluateFolder(name, config, collection!, entryMap, field),
    );
  }
  if (isAbsolutePath(publicFolder)) return joinUrlPath(publicFolder, basename(mediaPath));
  return join(publicFolder, basename(mediaPath));
}

export function selectEditingDraft(state: EntryDraft) {
  const entry = state.entry;
  return entry && Object.keys(entry).length > 0;
}

export default entries;
