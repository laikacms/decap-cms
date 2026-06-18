import { dirname, join } from 'path';
import { isAbsolutePath, basename } from 'decap-cms-lib-util';
import trim from 'lodash/trim';
import once from 'lodash/once';
import sortBy from 'lodash/sortBy';
import set from 'lodash/set';
import get from 'lodash/get';
import orderBy from 'lodash/orderBy';
import groupBy from 'lodash/groupBy';
import { stringTemplate } from 'decap-cms-lib-widgets';

import { SortDirection } from '../types/redux';
import { folderFormatter } from '../lib/formatters';
import { selectSortDataPath } from './collections';
import { SEARCH_ENTRIES_SUCCESS } from '../actions/search';
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
} from '../actions/entries';
import { VIEW_STYLE_LIST } from '../constants/collectionViews';
import { joinUrlPath } from '../lib/urlHelper';

import type {
  EntriesAction,
  EntryRequestPayload,
  EntrySuccessPayload,
  EntriesSuccessPayload,
  EntryObject,
  Entries,
  CmsConfig,
  Collection,
  EntryFailurePayload,
  EntryDeletePayload,
  EntriesRequestPayload,
  EntryDraft,
  EntryMap,
  EntryField,
  CollectionFiles,
  EntriesSortRequestPayload,
  EntriesSortFailurePayload,
  SortMap,
  SortObject,
  Sort,
  FilterMap,
  GroupMap,
  EntriesFilterRequestPayload,
  EntriesFilterFailurePayload,
  ChangeViewStylePayload,
  EntriesGroupRequestPayload,
  EntriesGroupFailurePayload,
  GroupOfEntries,
} from '../types/redux';

const { keyToPathArray } = stringTemplate;

let collection: string;
let loadedEntries: EntryObject[];
let append: boolean;
let page: number;
let slug: string;

const storageSortKey = 'decap-cms.entries.sort';
const viewStyleKey = 'decap-cms.entries.viewStyle';

function normalizeDoubleSlashes(path: string) {
  if (!path) {
    return path;
  }

  return path.replace(/([^:]\/)\/+/g, '$1');
}
type StorageSortObject = SortObject & { index: number };
type StorageSort = { [collection: string]: { [key: string]: StorageSortObject } };

const loadSort = once((): Sort => {
  const sortString = localStorage.getItem(storageSortKey);
  if (sortString) {
    try {
      const sort: StorageSort = JSON.parse(sortString);
      let map: Sort = {};
      Object.entries(sort).forEach(([collection, collectionSort]) => {
        let orderedMap: SortMap = {};
        sortBy(Object.values(collectionSort), ['index']).forEach(value => {
          const { key, direction } = value;
          orderedMap = { ...orderedMap, [key]: { key, direction } };
        });
        map = { ...map, [collection]: orderedMap };
      });
      return map;
    } catch (e) {
      return {};
    }
  }
  return {};
});

function clearSort() {
  localStorage.removeItem(storageSortKey);
}

function persistSort(sort: Sort | undefined) {
  if (sort) {
    const storageSort: StorageSort = {};
    Object.keys(sort).forEach(key => {
      const collection = key;
      const sortObjects = (Object.values(sort[collection]) as SortObject[]).map((value, index) => ({
        ...value,
        index,
      }));

      sortObjects.forEach(value => {
        set(storageSort, [collection, value.key], value);
      });
    });
    localStorage.setItem(storageSortKey, JSON.stringify(storageSort));
  } else {
    clearSort();
  }
}

const loadViewStyle = once(() => {
  const viewStyle = localStorage.getItem(viewStyleKey);
  if (viewStyle) {
    return viewStyle;
  }

  localStorage.setItem(viewStyleKey, VIEW_STYLE_LIST);
  return VIEW_STYLE_LIST;
});

function clearViewStyle() {
  localStorage.removeItem(viewStyleKey);
}

function persistViewStyle(viewStyle: string | undefined) {
  if (viewStyle) {
    localStorage.setItem(viewStyleKey, viewStyle);
  } else {
    clearViewStyle();
  }
}

const defaultEntriesState: Entries = {
  entities: {},
  pages: {},
  sort: loadSort(),
  viewStyle: loadViewStyle(),
  filter: {},
  group: {},
};

function entries(state: Entries = defaultEntriesState, action: EntriesAction): Entries {
  switch (action.type) {
    case ENTRY_REQUEST: {
      const payload = action.payload as EntryRequestPayload;
      const key = `${payload.collection}.${payload.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: { ...state.entities?.[key], isFetching: true } as EntryMap,
        },
      };
    }

    case ENTRY_SUCCESS: {
      const payload = action.payload as EntrySuccessPayload;
      collection = payload.collection;
      slug = payload.entry.slug;
      const key = `${collection}.${slug}`;
      const ids = state.pages?.[collection]?.ids ?? [];
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: payload.entry,
        },
        pages: {
          ...state.pages,
          [collection]: {
            ...state.pages?.[collection],
            ids: ids.includes(slug) ? ids : [slug, ...ids],
          },
        },
      };
    }

    case ENTRIES_REQUEST: {
      const payload = action.payload as EntriesRequestPayload;
      return {
        ...state,
        pages: {
          ...state.pages,
          [payload.collection]: {
            ...state.pages?.[payload.collection],
            isFetching: true,
          },
        },
      };
    }

    case ENTRIES_SUCCESS: {
      const payload = action.payload as EntriesSuccessPayload;
      collection = payload.collection;
      loadedEntries = payload.entries;
      append = payload.append;
      page = payload.page;

      const newEntities = { ...state.entities };
      loadedEntries.forEach(entry => {
        newEntities[`${collection}.${entry.slug}`] = { ...entry, isFetching: false } as EntryMap;
      });

      const ids = loadedEntries.map(entry => entry.slug);
      const existingIds = state.pages?.[collection]?.ids ?? [];
      return {
        ...state,
        entities: newEntities,
        pages: {
          ...state.pages,
          [collection]: {
            isFetching: false,
            page,
            ids: append ? [...existingIds, ...ids] : ids,
          },
        },
      };
    }

    case ENTRIES_FAILURE:
      return {
        ...state,
        pages: {
          ...state.pages,
          [action.meta.collection]: {
            ...state.pages?.[action.meta.collection],
            isFetching: false,
          },
        },
      };

    case ENTRY_FAILURE: {
      const payload = action.payload as EntryFailurePayload;
      const key = `${payload.collection}.${payload.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: {
            ...state.entities?.[key],
            isFetching: false,
            error: payload.error.message,
          } as EntryMap,
        },
      };
    }

    case SEARCH_ENTRIES_SUCCESS: {
      const payload = action.payload as EntriesSuccessPayload;
      loadedEntries = payload.entries;
      const newEntities = { ...state.entities };
      loadedEntries.forEach(entry => {
        newEntities[`${entry.collection}.${entry.slug}`] = {
          ...entry,
          isFetching: false,
        } as EntryMap;
      });
      return { ...state, entities: newEntities };
    }

    case ENTRY_DELETE_SUCCESS: {
      const payload = action.payload as EntryDeletePayload;
      const { [`${payload.collectionName}.${payload.entrySlug}`]: _, ...entities } = state.entities;
      const collectionPage = state.pages?.[payload.collectionName];
      return {
        ...state,
        entities,
        pages: {
          ...state.pages,
          [payload.collectionName]: {
            ...collectionPage,
            ids: (collectionPage?.ids ?? []).filter(id => id !== payload.entrySlug),
          },
        },
      };
    }

    case SORT_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesSortRequestPayload;
      const { collection, key, direction } = payload;
      const newSort: Sort = {
        ...state.sort,
        [collection]: { [key]: { key, direction: direction as SortDirection } },
      };
      const newState: Entries = {
        ...state,
        sort: newSort,
        pages: {
          ...state.pages,
          [collection]: {
            ...state.pages?.[collection],
            isFetching: true,
            page: undefined as unknown as number,
          },
        },
      };
      persistSort(newState.sort);
      return newState;
    }

    case GROUP_ENTRIES_SUCCESS:
    case FILTER_ENTRIES_SUCCESS:
    case SORT_ENTRIES_SUCCESS: {
      const payload = action.payload as { collection: string; entries: EntryObject[] };
      const { collection, entries } = payload;
      loadedEntries = entries;
      const newEntities = { ...state.entities };
      loadedEntries.forEach(entry => {
        newEntities[`${entry.collection}.${entry.slug}`] = {
          ...entry,
          isFetching: false,
        } as EntryMap;
      });
      const ids = loadedEntries.map(entry => entry.slug);
      return {
        ...state,
        entities: newEntities,
        pages: {
          ...state.pages,
          [collection]: {
            page: 1,
            ids,
            isFetching: false,
          },
        },
      };
    }

    case SORT_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesSortFailurePayload;
      const { collection, key } = payload;
      const collectionSort = state.sort?.[collection];
      const { [key]: _removed, ...restSort } = collectionSort ?? {};
      const newSort: Sort = { ...state.sort, [collection]: restSort };
      const newState: Entries = {
        ...state,
        sort: newSort,
        pages: {
          ...state.pages,
          [collection]: {
            ...state.pages?.[collection],
            isFetching: false,
          },
        },
      };
      persistSort(newState.sort);
      return newState;
    }

    case FILTER_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesFilterRequestPayload;
      const { collection, filter } = payload;
      const current: FilterMap = state.filter?.[collection]?.[filter.id] ?? (filter as FilterMap);
      return {
        ...state,
        filter: {
          ...state.filter,
          [collection]: {
            ...state.filter?.[collection],
            [current.id]: { ...current, active: !current.active },
          },
        },
      };
    }

    case FILTER_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesFilterFailurePayload;
      const { collection, filter } = payload;
      const { [filter.id]: _, ...collectionFilter } = state.filter?.[collection] ?? {};
      return {
        ...state,
        filter: {
          ...state.filter,
          [collection]: collectionFilter,
        },
        pages: {
          ...state.pages,
          [collection]: {
            ...state.pages?.[collection],
            isFetching: false,
          },
        },
      };
    }

    case GROUP_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesGroupRequestPayload;
      const { collection, group } = payload;
      const current: GroupMap = state.group?.[collection]?.[group.id] ?? (group as GroupMap);
      return {
        ...state,
        group: {
          ...state.group,
          [collection]: {
            [current.id]: { ...current, active: !current.active },
          },
        },
      };
    }

    case GROUP_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesGroupFailurePayload;
      const { collection, group } = payload;
      const { [group.id]: _, ...collectionGroup } = state.group?.[collection] ?? {};
      return {
        ...state,
        group: {
          ...state.group,
          [collection]: collectionGroup,
        },
        pages: {
          ...state.pages,
          [collection]: {
            ...state.pages?.[collection],
            isFetching: false,
          },
        },
      };
    }

    case CHANGE_VIEW_STYLE: {
      const payload = action.payload as unknown as ChangeViewStylePayload;
      const { style } = payload;
      const newState: Entries = { ...state, viewStyle: style };
      persistViewStyle(newState.viewStyle);
      return newState;
    }

    default:
      return state;
  }
}

export function selectEntriesSort(entries: Entries, collection: string) {
  const sort = entries.sort;
  return sort?.[collection];
}

export function selectEntriesFilter(entries: Entries, collection: string) {
  const filter = entries.filter;
  return filter?.[collection] ?? {};
}

export function selectEntriesGroup(entries: Entries, collection: string) {
  const group = entries.group;
  return group?.[collection] ?? {};
}

export function selectEntriesGroupField(entries: Entries, collection: string) {
  const groups = selectEntriesGroup(entries, collection);
  const value = Object.values(groups ?? {}).find(v => v?.active === true);
  return value;
}

export function selectEntriesSortFields(entries: Entries, collection: string) {
  const sort = selectEntriesSort(entries, collection);
  return Object.values(sort ?? {}).filter(v => v?.direction !== SortDirection.None);
}

export function selectEntriesFilterFields(entries: Entries, collection: string) {
  const filter = selectEntriesFilter(entries, collection);
  return Object.values(filter ?? {}).filter(v => v?.active === true);
}

export function selectViewStyle(entries: Entries) {
  return entries.viewStyle;
}

export function selectEntry(state: Entries, collection: string, slug: string) {
  return state.entities?.[`${collection}.${slug}`];
}

export function selectPublishedSlugs(state: Entries, collection: string): string[] {
  return state.pages?.[collection]?.ids ?? [];
}

function getPublishedEntries(state: Entries, collectionName: string): EntryMap[] {
  const slugs = selectPublishedSlugs(state, collectionName);
  return slugs.map(slug => selectEntry(state, collectionName, slug)).filter(Boolean) as EntryMap[];
}

export function selectEntries(state: Entries, collection: Collection) {
  const collectionName = collection.name;
  let entries = getPublishedEntries(state, collectionName);

  const sortFields = selectEntriesSortFields(state, collectionName);
  if (sortFields && sortFields.length > 0) {
    const keys = sortFields.map(v => selectSortDataPath(collection, v.key));
    const orders = sortFields.map(v => (v.direction === SortDirection.Ascending ? 'asc' : 'desc'));
    entries = orderBy(entries, keys, orders) as EntryMap[];
  }

  const filters = selectEntriesFilterFields(state, collectionName);
  if (filters && filters.length > 0) {
    entries = entries.filter(e => {
      const allMatched = filters.every(f => {
        const pattern = f.pattern;
        const field = f.field;
        const data = (e?.data ?? {}) as Record<string, unknown>;
        const toMatch = get(data, keyToPathArray(field));
        const matched =
          toMatch !== undefined &&
          (typeof pattern === 'boolean'
            ? toMatch === pattern
            : new RegExp(String(pattern)).test(String(toMatch)));
        return matched;
      });
      return allMatched;
    });
  }

  return entries;
}

function getGroup(entry: EntryMap, selectedGroup: GroupMap) {
  const label = selectedGroup.label;
  const field = selectedGroup.field;

  const fieldData = get(entry.data, keyToPathArray(field));
  if (fieldData === undefined) {
    return {
      id: 'missing_value',
      label,
      value: fieldData,
    };
  }

  const dataAsString = String(fieldData);
  if ('pattern' in selectedGroup) {
    const pattern = selectedGroup.pattern as string;
    let value = '';
    try {
      const regex = new RegExp(pattern);
      const matched = dataAsString.match(regex);
      if (matched) {
        value = matched[0];
      }
    } catch (e) {
      console.warn(`Invalid view group pattern '${pattern}' for field '${field}'`, e);
    }
    return {
      id: `${label}${value}`,
      label,
      value,
    };
  }

  return {
    id: `${label}${fieldData}`,
    label,
    value: typeof fieldData === 'boolean' ? fieldData : dataAsString,
  };
}

export function selectGroups(state: Entries, collection: Collection) {
  const collectionName = collection.name;
  const entries = getPublishedEntries(state, collectionName);

  const selectedGroup = selectEntriesGroupField(state, collectionName);
  if (selectedGroup === undefined) {
    return [];
  }

  let groups: Record<string, { id: string; label: string; value: string | boolean | undefined }> =
    {};
  const groupedEntries = groupBy(entries, entry => {
    const group = getGroup(entry, selectedGroup);
    groups = { ...groups, [group.id]: group };
    return group.id;
  });

  const groupsArray: GroupOfEntries[] = Object.entries(groupedEntries).map(([id, entries]) => {
    return {
      ...groups[id],
      paths: [...new Set(entries.map(entry => entry?.path))].filter(Boolean) as string[],
    };
  });

  return groupsArray;
}

export function selectEntryByPath(state: Entries, collection: string, path: string) {
  const slugs = selectPublishedSlugs(state, collection);
  const entries = slugs
    .map(slug => selectEntry(state, collection, slug))
    .filter(Boolean) as EntryMap[];
  return entries.find(e => e?.path === path);
}

export function selectEntriesLoaded(state: Entries, collection: string) {
  return !!state.pages?.[collection];
}

export function selectIsFetching(state: Entries, collection: string) {
  return state.pages?.[collection]?.isFetching ?? false;
}

function getFileField(collectionFiles: CollectionFiles, slug: string | undefined) {
  const file = collectionFiles.find(f => f?.name === slug);
  return file;
}

function hasCustomFolder(
  folderKey: 'media_folder' | 'public_folder',
  collection: Collection | null,
  slug: string | undefined,
  field: EntryField | undefined,
) {
  if (!collection) {
    return false;
  }

  if (field && folderKey in field) {
    return true;
  }

  if ('files' in collection && collection.files) {
    const file = getFileField(collection.files!, slug);
    if (file && folderKey in file) {
      return true;
    }
  }

  if (folderKey in collection) {
    return true;
  }

  return false;
}

function traverseFields(
  folderKey: 'media_folder' | 'public_folder',
  config: CmsConfig,
  collection: Collection,
  entryMap: EntryMap | undefined,
  field: EntryField,
  fields: EntryField[],
  currentFolder: string,
): string | null {
  const matchedField = fields.filter(f => f === field)[0];
  if (matchedField) {
    return folderFormatter(
      folderKey in matchedField ? (matchedField as any)[folderKey] : `{{${folderKey}}}`,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );
  }

  for (let f of fields) {
    if (!(folderKey in f)) {
      // add identity template if doesn't exist
      f = { ...f, [folderKey]: `{{${folderKey}}}` };
    }
    const folder = folderFormatter(
      (f as any)[folderKey],
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );
    let fieldFolder = null;
    if ('fields' in f && f.fields) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        f.fields!,
        folder,
      );
    } else if ('field' in f && f.field) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        [f.field!],
        folder,
      );
    } else if ('types' in f && f.types) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        f.types!,
        folder,
      );
    }
    if (fieldFolder != null) {
      return fieldFolder;
    }
  }

  return null;
}

function evaluateFolder(
  folderKey: 'media_folder' | 'public_folder',
  config: CmsConfig,
  collection: Collection,
  entryMap: EntryMap | undefined,
  field: EntryField | undefined,
) {
  let currentFolder = config[folderKey]!;

  // add identity template if doesn't exist
  if (!(folderKey in collection)) {
    collection = { ...collection, [folderKey]: `{{${folderKey}}}` };
  }

  if ('files' in collection && collection.files) {
    // files collection evaluate the collection template
    // then move on to the specific file configuration denoted by the slug
    currentFolder = folderFormatter(
      (collection as any)[folderKey]!,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );

    let file = getFileField(collection.files!, entryMap?.slug);
    if (file) {
      if (!(folderKey in file)) {
        // add identity template if doesn't exist
        file = { ...file, [folderKey]: `{{${folderKey}}}` };
      }

      // evaluate the file template and keep evaluating until we match our field
      currentFolder = folderFormatter(
        (file as any)[folderKey]!,
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
          file.fields!,
          currentFolder,
        );

        if (fieldFolder !== null) {
          currentFolder = fieldFolder;
        }
      }
    }
  } else {
    // folder collection, evaluate the collection template
    // and keep evaluating until we match our field
    currentFolder = folderFormatter(
      (collection as any)[folderKey]!,
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
        collection.fields!,
        currentFolder,
      );

      if (fieldFolder !== null) {
        currentFolder = fieldFolder;
      }
    }
  }

  return currentFolder;
}

export function selectMediaFolder(
  config: CmsConfig,
  collection: Collection | null,
  entryMap: EntryMap | undefined,
  field: EntryField | undefined,
) {
  const name = 'media_folder';
  let mediaFolder = config[name];

  const customFolder = hasCustomFolder(name, collection, entryMap?.slug, field);

  if (customFolder) {
    const folder = evaluateFolder(name, config, collection!, entryMap, field);
    if (folder.startsWith('/')) {
      // return absolute paths as is
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
  collection: Collection | null,
  entryMap: EntryMap | undefined,
  mediaPath: string,
  field: EntryField | undefined,
) {
  if (isAbsolutePath(mediaPath)) {
    return mediaPath;
  }

  const mediaFolder = selectMediaFolder(config, collection, entryMap, field);

  return join(mediaFolder, basename(mediaPath));
}

export function selectMediaFilePublicPath(
  config: CmsConfig,
  collection: Collection | null,
  mediaPath: string,
  entryMap: EntryMap | undefined,
  field: EntryField | undefined,
) {
  if (isAbsolutePath(mediaPath)) {
    return mediaPath;
  }

  const name = 'public_folder';
  let publicFolder = normalizeDoubleSlashes(config[name]!);

  const customFolder = hasCustomFolder(name, collection, entryMap?.slug, field);

  if (customFolder) {
    publicFolder = normalizeDoubleSlashes(
      evaluateFolder(name, config, collection!, entryMap, field),
    );
  }

  if (isAbsolutePath(publicFolder)) {
    return joinUrlPath(publicFolder, basename(mediaPath));
  }

  return join(publicFolder, basename(mediaPath));
}

export function selectEditingDraft(state: EntryDraft) {
  const entry = state.entry;
  const workflowDraft = entry && Object.keys(entry).length > 0;
  return workflowDraft;
}

export default entries;
