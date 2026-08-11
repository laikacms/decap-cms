import { isEqual } from 'lodash-es';

import { currentBackend } from '@/core/backend';
import ValidationErrorTypes from '@/core/constants/validationErrorTypes';
import { getIntegrationProvider } from '@/core/integrations';
import { getProcessSegment } from '@/core/lib/formatters';
import { duplicateDefaultI18nFields, hasI18n, I18N, I18N_FIELD, serializeI18n } from '@/core/lib/i18n';
import { serializeValues } from '@/core/lib/serializeEntryValues';
import { selectDefaultSortField, selectField, selectFields, updateFieldByKey } from '@/core/reducers/collections';
import { selectCollectionEntriesCursor } from '@/core/reducers/cursors';
import {
  isCompleteEntry,
  selectEntriesLoaded,
  selectEntriesSortFields,
  selectEntry,
  selectEntryByPath,
  selectIsFetching,
} from '@/core/reducers/entries';
import { selectCustomPath } from '@/core/reducers/entryDraft';
import { selectIntegration, selectPublishedSlugs } from '@/core/reducers/selectors';
import { navigateToEntry } from '@/core/routing/navigation';
import { createAssetProxy } from '@/core/valueObjects/AssetProxy';
import { createEntry } from '@/core/valueObjects/Entry';
import { Cursor } from '@/lib/util/index';
import { CmsSortDirection } from '@/lib/util/index';
import queryCore, { collectionTag, entryTag } from '@/lib/util/queryCore';
import { addAssets, getAsset } from './media';
import { loadMedia, waitForMediaLibraryToLoad } from './mediaLibrary';
import { addNotification } from './notifications';
import { waitUntil } from './waitUntil';

import type { Backend } from '@/core/backend';
import type Algolia from '@/core/integrations/providers/algolia/implementation';
import type AssetProxy from '@/core/valueObjects/AssetProxy';
import type { CompleteEntryValue, EntryValue } from '@/core/valueObjects/Entry';
import type {
  CmsBackendMediaFile,
  CmsCollectionState,
  CmsEntry,
  CmsEntryField,
  CmsEntryFields,
  CmsViewFilter,
  CmsViewGroup,
} from '@/lib/util/index';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

type State = any;

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;
type EntryFields = CmsEntryFields;
type ViewFilter = CmsViewFilter;
type ViewGroup = CmsViewGroup;
type SortDirection = CmsSortDirection;
const SortDirection = CmsSortDirection;

/*
 * Constant Declarations
 */
export const ENTRY_REQUEST = 'ENTRY_REQUEST';
export const ENTRY_SUCCESS = 'ENTRY_SUCCESS';
export const ENTRY_FAILURE = 'ENTRY_FAILURE';

export const ENTRIES_REQUEST = 'ENTRIES_REQUEST';
export const ENTRIES_SUCCESS = 'ENTRIES_SUCCESS';
export const ENTRIES_FAILURE = 'ENTRIES_FAILURE';

export const SORT_ENTRIES_REQUEST = 'SORT_ENTRIES_REQUEST';
export const SORT_ENTRIES_SUCCESS = 'SORT_ENTRIES_SUCCESS';
export const SORT_ENTRIES_FAILURE = 'SORT_ENTRIES_FAILURE';

export const FILTER_ENTRIES_REQUEST = 'FILTER_ENTRIES_REQUEST';
export const FILTER_ENTRIES_SUCCESS = 'FILTER_ENTRIES_SUCCESS';
export const FILTER_ENTRIES_FAILURE = 'FILTER_ENTRIES_FAILURE';

export const GROUP_ENTRIES_REQUEST = 'GROUP_ENTRIES_REQUEST';
export const GROUP_ENTRIES_SUCCESS = 'GROUP_ENTRIES_SUCCESS';
export const GROUP_ENTRIES_FAILURE = 'GROUP_ENTRIES_FAILURE';

export const DRAFT_CREATE_FROM_ENTRY = 'DRAFT_CREATE_FROM_ENTRY';
export const DRAFT_CREATE_EMPTY = 'DRAFT_CREATE_EMPTY';
export const DRAFT_DISCARD = 'DRAFT_DISCARD';
export const DRAFT_CHANGE_FIELD = 'DRAFT_CHANGE_FIELD';
export const DRAFT_VALIDATION_ERRORS = 'DRAFT_VALIDATION_ERRORS';
export const DRAFT_CLEAR_ERRORS = 'DRAFT_CLEAR_ERRORS';
export const DRAFT_LOCAL_BACKUP_RETRIEVED = 'DRAFT_LOCAL_BACKUP_RETRIEVED';
export const DRAFT_CREATE_FROM_LOCAL_BACKUP = 'DRAFT_CREATE_FROM_LOCAL_BACKUP';
export const DRAFT_CREATE_DUPLICATE_FROM_ENTRY = 'DRAFT_CREATE_DUPLICATE_FROM_ENTRY';

export const ENTRY_PERSIST_REQUEST = 'ENTRY_PERSIST_REQUEST';
export const ENTRY_PERSIST_SUCCESS = 'ENTRY_PERSIST_SUCCESS';
export const ENTRY_PERSIST_FAILURE = 'ENTRY_PERSIST_FAILURE';

export const ENTRY_DELETE_REQUEST = 'ENTRY_DELETE_REQUEST';
export const ENTRY_DELETE_SUCCESS = 'ENTRY_DELETE_SUCCESS';
export const ENTRY_DELETE_FAILURE = 'ENTRY_DELETE_FAILURE';

export const ADD_DRAFT_ENTRY_MEDIA_FILE = 'ADD_DRAFT_ENTRY_MEDIA_FILE';
export const REMOVE_DRAFT_ENTRY_MEDIA_FILE = 'REMOVE_DRAFT_ENTRY_MEDIA_FILE';

export const CHANGE_VIEW_STYLE = 'CHANGE_VIEW_STYLE';

/*
 * Simple Action Creators (Internal)
 */
export function entryLoading(collection: Collection, slug: string) {
  return {
    type: ENTRY_REQUEST,
    payload: {
      collection: collection.name,
      slug,
    },
  };
}

export function entryLoaded(collection: Collection, entry: EntryValue) {
  return {
    type: ENTRY_SUCCESS,
    payload: {
      collection: collection.name,
      entry,
    },
  };
}

export function entryLoadError(error: Error, collection: Collection, slug: string) {
  return {
    type: ENTRY_FAILURE,
    payload: {
      error,
      collection: collection.name,
      slug,
    },
  };
}

export function entriesLoading(collection: Collection) {
  return {
    type: ENTRIES_REQUEST,
    payload: {
      collection: collection.name,
    },
  };
}

export function entriesLoaded(
  collection: Collection,
  entries: EntryValue[],
  pagination: number | null,
  cursor: Cursor,
  append = true,
) {
  return {
    type: ENTRIES_SUCCESS,
    payload: {
      collection: collection.name,
      entries,
      page: pagination,
      cursor: Cursor.create(cursor),
      append,
    },
  };
}

export function entriesFailed(collection: Collection, error: Error) {
  return {
    type: ENTRIES_FAILURE,
    error: 'Failed to load entries',
    payload: error.toString(),
    meta: { collection: collection.name },
  };
}

export async function getAllEntries(state: State, collection: Collection) {
  const backend = currentBackend(state.config);
  const integration = selectIntegration(state, collection.name, 'listEntries');

  const provider: Algolia | Backend = integration
    ? (getIntegrationProvider(state.integrations, backend.getToken as any, integration) as Algolia)
    : backend;
  // Full-collection listings are requested from several places (sort/filter/group,
  // search, relation lookups); dedup them and reuse the result within the TTL window.
  const entries = await queryCore.fetch<EntryValue[]>(
    `entries-all/${collection.name}`,
    () => provider.listAllEntries(collection),
    { tags: [collectionTag(collection.name)], keepValue: true },
  );
  return entries;
}

export function sortByField(
  collection: Collection,
  key: string,
  direction: SortDirection = SortDirection.Ascending,
) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const isFetching = selectIsFetching(state.entries, collection.name);
    dispatch({
      type: SORT_ENTRIES_REQUEST,
      payload: {
        collection: collection.name,
        key,
        direction,
      },
    });
    if (isFetching) return;

    try {
      const entries = await getAllEntries(state, collection);
      dispatch({
        type: SORT_ENTRIES_SUCCESS,
        payload: { collection: collection.name, key, direction, entries },
      });
    } catch (error: unknown) {
      dispatch({
        type: SORT_ENTRIES_FAILURE,
        payload: { collection: collection.name, key, direction, error },
      });
    }
  };
}

export function filterByField(collection: Collection, filter: ViewFilter) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const isFetching = selectIsFetching(state.entries, collection.name);
    dispatch({
      type: FILTER_ENTRIES_REQUEST,
      payload: { collection: collection.name, filter },
    });
    if (isFetching) return;

    try {
      const entries = await getAllEntries(state, collection);
      dispatch({
        type: FILTER_ENTRIES_SUCCESS,
        payload: { collection: collection.name, filter, entries },
      });
    } catch (error: unknown) {
      dispatch({
        type: FILTER_ENTRIES_FAILURE,
        payload: { collection: collection.name, filter, error },
      });
    }
  };
}

export function groupByField(collection: Collection, group: ViewGroup) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const isFetching = selectIsFetching(state.entries, collection.name);
    dispatch({
      type: GROUP_ENTRIES_REQUEST,
      payload: { collection: collection.name, group },
    });
    if (isFetching) return;

    try {
      const entries = await getAllEntries(state, collection);
      dispatch({
        type: GROUP_ENTRIES_SUCCESS,
        payload: { collection: collection.name, group, entries },
      });
    } catch (error: unknown) {
      dispatch({
        type: GROUP_ENTRIES_FAILURE,
        payload: { collection: collection.name, group, error },
      });
    }
  };
}

export function changeViewStyle(viewStyle: string) {
  return {
    type: CHANGE_VIEW_STYLE,
    payload: { style: viewStyle },
  };
}

export function entryPersisting(collection: Collection, entry: EntryMap) {
  return {
    type: ENTRY_PERSIST_REQUEST,
    payload: {
      collectionName: collection.name,
      entrySlug: entry.slug,
    },
  };
}

export function entryPersisted(collection: Collection, entry: EntryMap, slug: string) {
  return {
    type: ENTRY_PERSIST_SUCCESS,
    payload: {
      collectionName: collection.name,
      entrySlug: entry.slug,
      slug,
      // The saved entry so the entries store can be updated without refetching.
      entry,
    },
  };
}

export function entryPersistFail(collection: Collection, entry: EntryMap, error: Error) {
  return {
    type: ENTRY_PERSIST_FAILURE,
    error: 'Failed to persist entry',
    payload: {
      collectionName: collection.name,
      entrySlug: entry.slug,
      error: error.toString(),
    },
  };
}

export function entryDeleting(collection: Collection, slug: string) {
  return {
    type: ENTRY_DELETE_REQUEST,
    payload: {
      collectionName: collection.name,
      entrySlug: slug,
    },
  };
}

export function entryDeleted(collection: Collection, slug: string) {
  return {
    type: ENTRY_DELETE_SUCCESS,
    payload: {
      collectionName: collection.name,
      entrySlug: slug,
    },
  };
}

export function entryDeleteFail(collection: Collection, slug: string, error: Error) {
  return {
    type: ENTRY_DELETE_FAILURE,
    payload: {
      collectionName: collection.name,
      entrySlug: slug,
      error: error.toString(),
    },
  };
}

export function emptyDraftCreated(entry: EntryValue) {
  return {
    type: DRAFT_CREATE_EMPTY,
    payload: entry,
  };
}

/**
 * Opens an entry for editing. Takes a complete entry on purpose: a projection
 * (a search hit carrying only indexed fields) would be saved back over the
 * real entry, dropping everything the index does not store. Callers holding an
 * entry of unknown provenance refetch instead of casting.
 */
export function createDraftFromEntry(
  entry: CompleteEntryValue | (CmsEntry & { projected?: false }),
) {
  return {
    type: DRAFT_CREATE_FROM_ENTRY,
    payload: { entry },
  };
}

export function draftDuplicateEntry(entry: EntryMap) {
  return {
    type: DRAFT_CREATE_DUPLICATE_FROM_ENTRY,
    payload: createEntry(entry.collection, '', '', {
      data: entry.data,
      i18n: entry.i18n as { [locale: string]: unknown } | undefined,
      mediaFiles: entry.mediaFiles ?? [],
    }),
  };
}

export function discardDraft() {
  return { type: DRAFT_DISCARD };
}

export function changeDraftField({
  field,
  value,
  metadata,
  entries,
  i18n,
}: {
  field: EntryField,
  value: string,
  metadata: Record<string, unknown>,
  entries: EntryMap[],
  i18n?: {
    currentLocale: string,
    defaultLocale: string,
    locales: string[],
  },
}) {
  return {
    type: DRAFT_CHANGE_FIELD,
    payload: { field, value, metadata, entries, i18n },
  };
}

export function changeDraftFieldValidation(
  uniquefieldId: string,
  errors: { type: string, parentIds: string[], message: string }[],
) {
  return {
    type: DRAFT_VALIDATION_ERRORS,
    payload: { uniquefieldId, errors },
  };
}

export function clearFieldErrors(uniqueFieldId: string) {
  return {
    type: DRAFT_CLEAR_ERRORS,
    payload: { uniqueFieldId },
  };
}

export function localBackupRetrieved(entry: EntryValue) {
  return {
    type: DRAFT_LOCAL_BACKUP_RETRIEVED,
    payload: { entry },
  };
}

export function loadLocalBackup() {
  return {
    type: DRAFT_CREATE_FROM_LOCAL_BACKUP,
  };
}

export function addDraftEntryMediaFile(file: CmsBackendMediaFile) {
  return { type: ADD_DRAFT_ENTRY_MEDIA_FILE, payload: file };
}

export function removeDraftEntryMediaFile({ id }: { id: string }) {
  return { type: REMOVE_DRAFT_ENTRY_MEDIA_FILE, payload: { id } };
}

export function persistLocalBackup(entry: EntryMap, collection: Collection) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    try {
      return await backend.persistLocalDraftBackup(entry, collection);
    } catch (error: unknown) {
      dispatch(
        addNotification({
          message: {
            details: error instanceof Error ? error.message : String(error),
            key: 'ui.toast.onFailToPersistLocalBackup',
          },
          type: 'error',
          dismissAfter: 8000,
        }),
      );
      return undefined;
    }
  };
}

export function createDraftDuplicateFromEntry(entry: EntryMap) {
  return (dispatch: ThunkDispatch<State, {}, AnyAction>) => {
    dispatch(
      waitUntil({
        predicate: ({ type }) => type === DRAFT_CREATE_EMPTY,
        run: () => dispatch(draftDuplicateEntry(entry)),
      }),
    );
  };
}

export function retrieveLocalBackup(collection: Collection, slug: string) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    const { entry } = await backend.getLocalDraftBackup(collection, slug);

    if (entry) {
      const mediaFiles = entry.mediaFiles || [];
      const assetProxies: AssetProxy[] = await Promise.all(
        mediaFiles.map(file => {
          if (file.file || file.url) {
            return createAssetProxy({
              path: file.path,
              file: file.file,
              url: file.url,
              field: file.field,
            });
          } else {
            return getAsset({
              collection: collection as any,
              entry: entry as any,
              path: file.path,
              field: file.field as any,
            })(dispatch, getState);
          }
        }),
      );
      dispatch(addAssets(assetProxies));
      return dispatch(localBackupRetrieved(entry));
    }
  };
}

export function deleteLocalBackup(collection: Collection, slug: string) {
  return (_dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    return backend.deleteLocalDraftBackup(collection, slug);
  };
}

/*
 * Exported Thunk Action Creators
 */

export function loadEntry(collection: Collection, slug: string) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const queryKey = `entry/${collection.name}/${slug}`;
    const entriesState = getState().entries;
    const existing = entriesState ? selectEntry(entriesState, collection.name, slug) : undefined;
    // A cached entry is only good enough to edit when it was loaded in full.
    // A search result overwrites the cache entry with whatever the index
    // stores (DCMS-1907), so an entry that is fresh by query key can still be
    // a projection; that one gets refetched below rather than opened.
    if (
      existing && !existing.error && !existing.isFetching && isCompleteEntry(existing)
      && queryCore.isFresh(queryKey)
    ) {
      dispatch(createDraftFromEntry(existing));
      return;
    }

    await waitForMediaLibraryToLoad(dispatch, getState());
    dispatch(entryLoading(collection, slug));

    try {
      const loadedEntry = await queryCore.fetch(
        queryKey,
        () => tryLoadEntry(getState(), collection, slug),
        { tags: [collectionTag(collection.name), entryTag(collection.name, slug)] },
      );
      // DCMS-1802: entries persisted before a field (e.g. `boolean` with
      // `default: false`) existed in the config have no key for it at all.
      // `createEmptyDraftData` only fills defaults for brand-new entries,
      // so without this the missing key reads as `undefined`, which
      // `validatePresence` treats as "empty" even though the field has a
      // perfectly valid configured default. Backfill any keys the loaded
      // entry doesn't already own; explicit values (including `false`,
      // `''`, etc.) are left untouched by `createEmptyDraftData`.
      const backfilledEntry = withDefaultsBackfilled(collection, loadedEntry);
      dispatch(entryLoaded(collection, backfilledEntry));
      dispatch(createDraftFromEntry(backfilledEntry));
    } catch (error: unknown) {
      dispatch(
        addNotification({
          message: {
            details: error instanceof Error ? error.message : String(error),
            key: 'ui.toast.onFailToLoadEntries',
          },
          type: 'error',
          dismissAfter: 8000,
        }),
      );
      dispatch(
        entryLoadError(error instanceof Error ? error : new Error(String(error)), collection, slug),
      );
    }
  };
}

export async function tryLoadEntry(state: State, collection: Collection, slug: string) {
  const backend = currentBackend(state.config);
  const loadedEntry = await backend.getEntry(state, collection, slug);
  return loadedEntry;
}

// DCMS-1802: fills in defaults for any data field the loaded entry doesn't
// already have a key for, without touching fields the entry already has an
// explicit (possibly empty-looking) value for. See `createEmptyDraftData`.
export function withDefaultsBackfilled(
  collection: Collection,
  entry: CompleteEntryValue,
): CompleteEntryValue {
  // `type` (folder vs. files collection) drives `selectFields`; callers
  // that pass a partial/malformed collection (e.g. missing config) have no
  // safe way to resolve fields, so leave the entry as loaded rather than
  // throwing and failing the whole load.
  if (!collection.type) {
    return entry;
  }

  const dataFields = getDataFields((selectFields(collection, entry.slug) ?? []) as EntryFields);
  if (dataFields.length === 0) {
    return entry;
  }

  const data = createEmptyDraftData(dataFields, undefined, entry.data as DraftEntryData);
  return { ...entry, data: data as EntryValue['data'] };
}

const appendActionsMap: Record<string, { action: string, append: boolean }> = {
  append_next: { action: 'next', append: true },
};

function addAppendActionsToCursor(cursor: Cursor) {
  const additionalActions = Object.entries(appendActionsMap)
    .filter(([, v]) => cursor.actions.has(v.action))
    .map(([key]) => key);
  return Cursor.create(cursor).mergeActions(new Set(additionalActions));
}

export function loadEntries(collection: Collection, page = 0) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const sortFields = selectEntriesSortFields(state.entries, collection.name);

    if (sortFields && sortFields.length > 0) {
      const field = sortFields[0];
      return dispatch(sortByField(collection, field.key, field.direction));
    }

    const defaultSort = selectDefaultSortField(collection as any);
    if (defaultSort) {
      const direction = defaultSort.direction === 'desc' ? SortDirection.Descending : SortDirection.Ascending;
      return dispatch(sortByField(collection, defaultSort.field, direction));
    }

    const queryKey = `entries/${collection.name}/${page}`;
    if (queryCore.isFresh(queryKey) && selectEntriesLoaded(state.entries, collection.name)) return;

    const backend = currentBackend(state.config);
    const integration = selectIntegration(state, collection.name, 'listEntries');

    const provider = integration
      ? getIntegrationProvider(state.integrations, backend.getToken as any, integration)
      : backend;
    const append = !!(page && !isNaN(page) && page > 0);

    // The whole load runs inside the coordinator so concurrent identical loads (for
    // example a collection view and the editor mounting together) share one request
    // and dispatch REQUEST/SUCCESS once.
    return queryCore.fetch(
      queryKey,
      async () => {
        dispatch(entriesLoading(collection));

        try {
          const loadAllEntries = collection.nested != null || hasI18n(collection as any);

          const response: {
            cursor?: Cursor,
            pagination: number,
            entries: EntryValue[],
          } = await (loadAllEntries
            ? (provider as any)
              .listAllEntries(collection)
              .then((entries: EntryValue[]) => ({ entries }))
            : (provider as any).listEntries(collection, page));

          const cursor = Cursor.create(response.cursor);

          dispatch(
            entriesLoaded(
              collection,
              response.entries,
              response.pagination,
              addAppendActionsToCursor(cursor),
              append,
            ),
          );
        } catch (err: unknown) {
          dispatch(
            addNotification({
              message: { details: err, key: 'ui.toast.onFailToLoadEntries' },
              type: 'error',
              dismissAfter: 8000,
            }),
          );
          dispatch(entriesFailed(collection, err instanceof Error ? err : new Error(String(err))));
          throw err;
        }
      },
      { tags: [collectionTag(collection.name)] },
    );
  };
}

function traverseCursor(backend: Backend, cursor: Cursor, action: string) {
  if (!cursor.actions.has(action)) {
    throw new Error(`The current cursor does not support the pagination action "${action}".`);
  }
  return backend.traverseCursor(cursor, action);
}

export function traverseCollectionCursor(collection: Collection, action: string) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const collectionName = collection.name;
    if (state.entries.pages[collectionName]?.isFetching) return;

    const backend = currentBackend(state.config);
    const { action: realAction, append } = appendActionsMap[action] ?? { action, append: false };

    const cursor = selectCollectionEntriesCursor(state.cursors as any, collectionName);

    // Integration providers (Algolia) page by page number rather than by link,
    // and have no `traverseCursor` of their own: re-request through loadEntries,
    // which routes back to the provider with the next page number.
    if (selectIntegration(state, collectionName, 'listEntries')) {
      const currentPage = (cursor.meta?.page as number | undefined) ?? 0;
      return dispatch(loadEntries(collection, currentPage + 1));
    }

    try {
      dispatch(entriesLoading(collection));
      const { entries, cursor: newCursor } = await traverseCursor(backend, cursor, realAction);
      const pagination = newCursor.meta?.page as number;
      return dispatch(
        entriesLoaded(collection, entries, pagination, addAppendActionsToCursor(newCursor), append),
      );
    } catch (err: unknown) {
      console.error(err);
      dispatch(
        addNotification({
          message: { details: err, key: 'ui.toast.onFailToLoadEntries' },
          type: 'error',
          dismissAfter: 8000,
        }),
      );
      return Promise.reject(
        dispatch(entriesFailed(collection, err instanceof Error ? err : new Error(String(err)))),
      );
    }
  };
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processValue(unsafe: string) {
  if (['true', 'True', 'TRUE'].includes(unsafe)) return true;
  if (['false', 'False', 'FALSE'].includes(unsafe)) return false;
  return escapeHtml(unsafe);
}

function getDataFields(fields: EntryFields) {
  return fields.filter(f => !f?.meta);
}

function getMetaFields(fields: EntryFields) {
  return fields.filter(f => f?.meta === true);
}

export function createEmptyDraft(collection: Collection, search: string) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const params = new URLSearchParams(search);
    const uniqueKeys = Array.from(new Set(params.keys()));

    uniqueKeys.forEach(key => {
      const field = selectField(collection, key);
      const isMultiple = Boolean(field?.multiple);
      const values = params.getAll(key);

      collection = updateFieldByKey(collection as any, key, field => ({
        ...field,
        default: isMultiple
          ? values.flatMap(value => value.split(',')).map(processValue)
          : processValue(values[values.length - 1]),
      }));
    });

    const fields = (collection.fields ?? []) as EntryField[];
    const dataFields = getDataFields(fields);
    const data = createEmptyDraftData(dataFields);
    const metaFields = getMetaFields(fields);
    const meta = createEmptyDraftData(metaFields);

    const state = getState();
    const backend = currentBackend(state.config);

    if (!collection.media_folder) {
      await waitForMediaLibraryToLoad(dispatch, getState());
    }

    const i18nFields = createEmptyDraftI18nData(collection, dataFields);

    let newEntry = createEntry(collection.name, '', '', {
      data,
      i18n: i18nFields,
      mediaFiles: [],

      meta: meta as any,
    });
    newEntry = await backend.processEntry(state, collection, newEntry);

    // `processEntry` above (and, for collections with no `media_folder`,
    // `waitForMediaLibraryToLoad`) can take real async time — e.g. a
    // network-backed media-folder listing. On a fresh new-entry mount,
    // `useEditor` fires this thunk at the same time it starts reading any
    // local backup out of IndexedDB, which is typically much faster. If the
    // user confirms restoring that backup (`DRAFT_CREATE_FROM_LOCAL_BACKUP`)
    // before this call finishes, dispatching the empty draft here would
    // silently discard the just-restored draft back to empty (DCMS-1149).
    // Bail once something else has already populated a real, changed draft.
    if (getState().entryDraft?.hasChanged) {
      return;
    }

    dispatch(emptyDraftCreated(newEntry));
  };
}

interface DraftEntryData {
  [name: string]:
    | string
    | null
    | boolean
    | unknown[]
    | DraftEntryData
    | DraftEntryData[]
    | (string | DraftEntryData | boolean | unknown[])[];
}

export function createEmptyDraftData(
  fields: EntryFields,
  skipField: (field: EntryField) => boolean = () => false,
  // DCMS-1802: when backfilling defaults onto an *existing* entry (as
  // opposed to seeding a brand-new one), `baseData` carries the entry's
  // already-loaded values. Any key it already owns - even an
  // empty-looking one like `false`, `''`, or `{}` - is a real, explicit
  // value and must win over the field's configured `default`.
  baseData?: DraftEntryData,
) {
  return fields.reduce(
    (
      reduction: DraftEntryData | string | undefined | boolean | unknown[],
      value: EntryField | undefined | boolean,
    ) => {
      const acc = reduction as DraftEntryData;
      const item = value as EntryField;

      if (skipField(item)) return acc;

      const name = item.name;
      if (baseData && Object.prototype.hasOwnProperty.call(baseData, name)) {
        return acc;
      }

      const subfields = item.field || item.fields;
      const list = item.widget === 'list';
      const defaultValue = item.default ?? null;

      function isEmptyDefaultValue(val: unknown) {
        return [[{}], {}].some(e => isEqual(val, e));
      }

      const hasSubfields = Array.isArray(subfields) || (typeof subfields === 'object' && subfields !== null);
      if (hasSubfields) {
        if (list && Array.isArray(defaultValue)) {
          acc[name] = defaultValue;
        } else {
          const asList = Array.isArray(subfields) ? subfields : [subfields as EntryField];
          const subDefaultValue = list
            ? [createEmptyDraftData(asList as EntryField[], skipField)]
            : createEmptyDraftData(asList as EntryField[], skipField);
          if (!isEmptyDefaultValue(subDefaultValue)) {
            acc[name] = subDefaultValue as any;
          }
        }
        return acc;
      }

      if (defaultValue !== null) {
        (acc as any)[name] = defaultValue;
      }

      return acc;
    },
    { ...(baseData || {}) } as DraftEntryData,
  );
}

function createEmptyDraftI18nData(collection: Collection, dataFields: EntryFields) {
  if (!hasI18n(collection as any)) return {};

  function skipField(field: EntryField) {
    return (
      (field as any)[I18N] !== I18N_FIELD.DUPLICATE && (field as any)[I18N] !== I18N_FIELD.TRANSLATE
    );
  }

  const i18nData = createEmptyDraftData(dataFields, skipField);
  return duplicateDefaultI18nFields(collection as any, i18nData);
}

export function getMediaAssets({ entry }: { entry: EntryMap }) {
  const filesArray = entry.mediaFiles ?? [];
  const assets = filesArray
    .filter((file: any) => file.draft)
    .map((file: any) =>
      createAssetProxy({
        path: file.path,
        file: file.file,
        url: file.url,
        field: file.field,
      })
    );
  return assets;
}

export function getSerializedEntry(collection: Collection, entry: EntryMap) {
  const fields = selectFields(collection as any, entry.slug);

  function serializeData(data: any) {
    return serializeValues(data, fields as any);
  }

  const serializedData = serializeData(entry.data);
  let serializedEntry: EntryMap = { ...entry, data: serializedData };
  if (hasI18n(collection as any)) {
    serializedEntry = serializeI18n(
      collection as any,
      serializedEntry as any,
      serializeData,
    ) as any;
  }
  return serializedEntry;
}

export function persistEntry(collection: Collection) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const entryDraft = state.entryDraft;
    const fieldsErrors = entryDraft.fieldsErrors;
    const usedSlugs = selectPublishedSlugs(state, collection.name) ?? [];

    if (Object.keys(fieldsErrors ?? {}).length > 0) {
      const hasPresenceErrors = Object.values(fieldsErrors!).some((errors: any) =>
        errors.some((error: any) => error.type && error.type === ValidationErrorTypes.PRESENCE)
      );

      // Always surface a notification when validation blocks the save - not
      // just for missing-required-field errors. Without this, Save/Publish
      // silently no-ops on any other validation failure (pattern mismatch,
      // custom widget validators, etc.), which looks like a dead button
      // (DCMS-484).
      dispatch(
        addNotification({
          message: {
            key: hasPresenceErrors ? 'ui.toast.missingRequiredField' : 'ui.toast.invalidField',
          },
          type: 'error',
          dismissAfter: 8000,
        }),
      );

      return Promise.reject();
    }

    const backend = currentBackend(state.config);
    const entry = entryDraft.entry;
    const assetProxies = getMediaAssets({ entry });
    const serializedEntry = getSerializedEntry(collection, entry);
    const serializedEntryDraft = { ...entryDraft, entry: serializedEntry };
    dispatch(entryPersisting(collection, serializedEntry));
    return backend
      .persistEntry({
        config: state.config,
        collection,
        entryDraft: serializedEntryDraft,
        assetProxies,
        usedSlugs,
      })
      .then(async (newSlug: string) => {
        dispatch(
          addNotification({
            message: { key: 'ui.toast.entrySaved' },
            type: 'success',
            dismissAfter: 4000,
          }),
        );

        if (assetProxies.length > 0) {
          await dispatch(loadMedia());
        }
        dispatch(entryPersisted(collection, serializedEntry, newSlug));
        // Also refreshes relation widget search results, which share the
        // collection tag (DCMS-606).
        queryCore.invalidateTags([
          collectionTag(collection.name),
          entryTag(collection.name, entry.slug),
          entryTag(collection.name, newSlug),
        ]);
        if (collection.nested != null) {
          await dispatch(loadEntries(collection));
        }
        if (entry.slug !== newSlug) {
          await dispatch(loadEntry(collection, newSlug));
          navigateToEntry(collection.name, newSlug);
        }
      })
      .catch((error: Error) => {
        console.error(error);
        dispatch(
          addNotification({
            message: { details: error, key: 'ui.toast.onFailToPersist' },
            type: 'error',
            dismissAfter: 8000,
          }),
        );
        return Promise.reject(dispatch(entryPersistFail(collection, serializedEntry, error)));
      });
  };
}

export function deleteEntry(collection: Collection, slug: string) {
  return (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);

    dispatch(entryDeleting(collection, slug));
    return backend
      .deleteEntry(state, collection, slug)
      .then(() => {
        dispatch(entryDeleted(collection, slug));
        queryCore.invalidateTags([
          collectionTag(collection.name),
          entryTag(collection.name, slug),
        ]);
      })
      .catch((error: Error) => {
        dispatch(
          addNotification({
            message: { details: error, key: 'ui.toast.onFailToDelete' },
            type: 'error',
            dismissAfter: 8000,
          }),
        );
        console.error(error);
        return Promise.reject(dispatch(entryDeleteFail(collection, slug, error)));
      });
  };
}

function getPathError(
  path: string | undefined,
  key: string,
  t: (key: string, args: Record<string, unknown>) => string,
) {
  return {
    error: {
      type: ValidationErrorTypes.CUSTOM,
      message: t(`editor.editorControlPane.widget.${key}`, { path }),
    },
  };
}

export function validateMetaField(
  state: State,
  collection: Collection,
  field: EntryField,
  value: string | undefined,
  t: (key: string, args: Record<string, unknown>) => string,
) {
  if (field.meta && field.name === 'path') {
    if (!value) return getPathError(value, 'invalidPath', t);

    const processSegment = getProcessSegment(state.config.slug);
    const sanitizedPath = (value as string)
      .split('/')
      .map(segment => processSegment(segment))
      .join('/');

    if (value !== sanitizedPath) return getPathError(value, 'invalidPath', t);

    const customPath = selectCustomPath(collection, {
      entry: { meta: { path: value } },
      fieldsErrors: {},
      hasChanged: false,
      key: '',
    } as any);
    const existingEntry = customPath
      ? selectEntryByPath(state.entries, collection.name, customPath)
      : undefined;

    const existingEntryPath = existingEntry?.path;
    const draftPath = state.entryDraft?.entry?.path;

    if (existingEntryPath && existingEntryPath !== draftPath) {
      return getPathError(value, 'pathExists', t);
    }
  }
  return { error: false };
}
