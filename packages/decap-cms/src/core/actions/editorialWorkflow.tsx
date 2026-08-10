import { get } from 'lodash-es';

import { currentBackend, slugFromCustomPath } from '@/core/backend';
import { EDITORIAL_WORKFLOW, status } from '@/core/constants/publishModes';
import ValidationErrorTypes from '@/core/constants/validationErrorTypes';
import { selectEditingDraft } from '@/core/reducers/entries';
import {
  selectEntry,
  selectPublishedSlugs,
  selectUnpublishedEntry,
  selectUnpublishedSlugs,
} from '@/core/reducers/selectors';
import { navigateToEntry } from '@/core/routing/navigation';
import { createAssetProxy } from '@/core/valueObjects/AssetProxy';
import { EDITORIAL_WORKFLOW_ERROR } from '@/lib/util/index';
import queryCore, { collectionTag, entryTag, UNPUBLISHED_TAG } from '@/lib/util/queryCore';
import {
  createDraftFromEntry,
  entryDeleted,
  getMediaAssets,
  getSerializedEntry,
  loadEntries,
  loadEntry,
} from './entries';
import { addAssets } from './media';
import { loadMedia } from './mediaLibrary';
import { addNotification } from './notifications';

import type { Status } from '@/core/constants/publishModes';
import type { EntryDraft } from '@/core/reducers/entryDraft';
import type { EntryValue } from '@/core/valueObjects/Entry';
import type { CmsCollections, CmsCollectionState, CmsEntry, CmsMediaFile } from '@/lib/util/index';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type Collections = CmsCollections;
type MediaFile = CmsMediaFile;

type State = any;

/*
 * Constant Declarations
 */
export const UNPUBLISHED_ENTRY_REQUEST = 'UNPUBLISHED_ENTRY_REQUEST';
export const UNPUBLISHED_ENTRY_SUCCESS = 'UNPUBLISHED_ENTRY_SUCCESS';
export const UNPUBLISHED_ENTRY_REDIRECT = 'UNPUBLISHED_ENTRY_REDIRECT';

export const UNPUBLISHED_ENTRIES_REQUEST = 'UNPUBLISHED_ENTRIES_REQUEST';
export const UNPUBLISHED_ENTRIES_SUCCESS = 'UNPUBLISHED_ENTRIES_SUCCESS';
export const UNPUBLISHED_ENTRIES_FAILURE = 'UNPUBLISHED_ENTRIES_FAILURE';

export const UNPUBLISHED_ENTRY_PERSIST_REQUEST = 'UNPUBLISHED_ENTRY_PERSIST_REQUEST';
export const UNPUBLISHED_ENTRY_PERSIST_SUCCESS = 'UNPUBLISHED_ENTRY_PERSIST_SUCCESS';
export const UNPUBLISHED_ENTRY_PERSIST_FAILURE = 'UNPUBLISHED_ENTRY_PERSIST_FAILURE';

export const UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST = 'UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST';
export const UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS = 'UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS';
export const UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE = 'UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE';

export const UNPUBLISHED_ENTRY_PUBLISH_REQUEST = 'UNPUBLISHED_ENTRY_PUBLISH_REQUEST';
export const UNPUBLISHED_ENTRY_PUBLISH_SUCCESS = 'UNPUBLISHED_ENTRY_PUBLISH_SUCCESS';
export const UNPUBLISHED_ENTRY_PUBLISH_FAILURE = 'UNPUBLISHED_ENTRY_PUBLISH_FAILURE';

export const UNPUBLISHED_ENTRY_DELETE_REQUEST = 'UNPUBLISHED_ENTRY_DELETE_REQUEST';
export const UNPUBLISHED_ENTRY_DELETE_SUCCESS = 'UNPUBLISHED_ENTRY_DELETE_SUCCESS';
export const UNPUBLISHED_ENTRY_DELETE_FAILURE = 'UNPUBLISHED_ENTRY_DELETE_FAILURE';

/*
 * Simple Action Creators (Internal)
 */

function unpublishedEntryLoading(collection: Collection, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_REQUEST,
    payload: {
      collection: collection.name,
      slug,
    },
  };
}

function unpublishedEntryLoaded(
  collection: Collection,
  entry: EntryValue & { mediaFiles: MediaFile[] },
) {
  return {
    type: UNPUBLISHED_ENTRY_SUCCESS,
    payload: {
      collection: collection.name,
      entry,
    },
  };
}

function unpublishedEntryRedirected(collection: Collection, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_REDIRECT,
    payload: {
      collection: collection.name,
      slug,
    },
  };
}

function unpublishedEntriesLoading() {
  return {
    type: UNPUBLISHED_ENTRIES_REQUEST,
  };
}

function unpublishedEntriesLoaded(entries: EntryValue[], pagination: number) {
  return {
    type: UNPUBLISHED_ENTRIES_SUCCESS,
    payload: {
      entries,
      pages: pagination,
    },
  };
}

function unpublishedEntriesFailed(error: Error) {
  return {
    type: UNPUBLISHED_ENTRIES_FAILURE,
    error: 'Failed to load entries',
    payload: error,
  };
}

function unpublishedEntryPersisting(collection: Collection, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_PERSIST_REQUEST,
    payload: {
      collection: collection.name,
      slug,
    },
  };
}

function unpublishedEntryPersisted(collection: Collection, entry: EntryMap) {
  return {
    type: UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
    payload: {
      collection: collection.name,
      entry,
    },
  };
}

function unpublishedEntryPersistedFail(error: Error, collection: Collection, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_PERSIST_FAILURE,
    payload: {
      error,
      collection: collection.name,
      slug,
    },
    error,
  };
}

function unpublishedEntryStatusChangeRequest(collection: string, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST,
    payload: {
      collection,
      slug,
    },
  };
}

function unpublishedEntryStatusChangePersisted(
  collection: string,
  slug: string,
  newStatus: Status,
) {
  return {
    type: UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
    payload: {
      collection,
      slug,
      newStatus,
    },
  };
}

function unpublishedEntryStatusChangeError(collection: string, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE,
    payload: { collection, slug },
  };
}

function unpublishedEntryPublishRequest(collection: string, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_PUBLISH_REQUEST,
    payload: { collection, slug },
  };
}

function unpublishedEntryPublished(collection: string, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
    payload: { collection, slug },
  };
}

function unpublishedEntryPublishError(collection: string, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_PUBLISH_FAILURE,
    payload: { collection, slug },
  };
}

function unpublishedEntryDeleteRequest(collection: string, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_DELETE_REQUEST,
    payload: { collection, slug },
  };
}

function unpublishedEntryDeleted(collection: string, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_DELETE_SUCCESS,
    payload: { collection, slug },
  };
}

function unpublishedEntryDeleteError(collection: string, slug: string) {
  return {
    type: UNPUBLISHED_ENTRY_DELETE_FAILURE,
    payload: { collection, slug },
  };
}

/*
 * Exported Thunk Action Creators
 */

export function loadUnpublishedEntry(collection: Collection, slug: string) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    const entriesLoaded = get(state.editorialWorkflow, 'pages.ids', false);
    // run possible unpublishedEntries migration
    if (!entriesLoaded) {
      try {
        const { entries, pagination } = await backend.unpublishedEntries(
          Object.values(state.collections) as any,
        );
        dispatch(unpublishedEntriesLoaded(entries, pagination));
      } catch (e: unknown) {
        console.error('Failed to load unpublished entries', e);
      }
    }

    dispatch(unpublishedEntryLoading(collection, slug));

    try {
      const entry = await backend.unpublishedEntry(state, collection, slug);
      const assetProxies = await Promise.all(
        entry.mediaFiles
          .filter(file => file.draft)
          .map(({ url, file, path }) =>
            createAssetProxy({
              path,
              url,
              file,
            })
          ),
      );
      dispatch(addAssets(assetProxies));
      dispatch(unpublishedEntryLoaded(collection, entry));
      dispatch(createDraftFromEntry(entry));
    } catch (error: unknown) {
      if (
        error instanceof Error
        && (error as Error & { notUnderEditorialWorkflow?: boolean }).name
          === EDITORIAL_WORKFLOW_ERROR
        && (error as Error & { notUnderEditorialWorkflow?: boolean }).notUnderEditorialWorkflow
      ) {
        dispatch(unpublishedEntryRedirected(collection, slug));
        dispatch(loadEntry(collection, slug));
      } else {
        dispatch(
          addNotification({
            message: {
              key: 'ui.toast.onFailToLoadEntries',
              details: error,
            },
            type: 'error',
            dismissAfter: 8000,
          }),
        );
      }
    }
  };
}

const UNPUBLISHED_QUERY_KEY = 'unpublished/all';

export function loadUnpublishedEntries(collections: Collections) {
  return (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);

    if (state.config.publish_mode !== EDITORIAL_WORKFLOW) {
      return;
    }

    // Loaded data stays on screen while stale data revalidates in the background;
    // within the freshness window repeated mounts cost no request at all.
    const entriesLoaded = get(state.editorialWorkflow, 'pages.ids', false);
    if (entriesLoaded && queryCore.isFresh(UNPUBLISHED_QUERY_KEY)) {
      return;
    }

    return queryCore
      .fetch(
        UNPUBLISHED_QUERY_KEY,
        () => {
          dispatch(unpublishedEntriesLoading());
          return backend
            .unpublishedEntries(Object.values(collections) as any)
            .then(response => dispatch(unpublishedEntriesLoaded(response.entries, response.pagination)));
        },
        { tags: [UNPUBLISHED_TAG] },
      )
      .catch((error: Error) => {
        dispatch(
          addNotification({
            message: {
              key: 'ui.toast.onFailToLoadEntries',
              details: error,
            },
            type: 'error',
            dismissAfter: 8000,
          }),
        );
        dispatch(unpublishedEntriesFailed(error));
      });
  };
}

export function persistUnpublishedEntry(collection: Collection, existingUnpublishedEntry: boolean) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const entryDraft = state.entryDraft;
    const fieldsErrors = entryDraft.fieldsErrors;
    const unpublishedSlugs = selectUnpublishedSlugs(state, collection.name);
    const publishedSlugs = selectPublishedSlugs(state, collection.name);
    const usedSlugs = [...(publishedSlugs || []), ...(unpublishedSlugs || [])];
    const entriesLoaded = get(state.editorialWorkflow, 'pages.ids', false);

    // load unpublishedEntries
    if (!entriesLoaded) dispatch(loadUnpublishedEntries(state.collections));

    // Early return if draft contains validation errors
    if (fieldsErrors && Object.keys(fieldsErrors).length > 0) {
      const hasPresenceErrors = Object.values(fieldsErrors).some((errors: any) =>
        errors.some((error: any) => error.type && error.type === ValidationErrorTypes.PRESENCE)
      );

      // See entries.tsx `persistEntry` (DCMS-484): notify on any validation
      // failure, not just missing-required-field, so Save never silently
      // no-ops.
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
    const assetProxies = getMediaAssets({
      entry,
    });

    const serializedEntry = getSerializedEntry(collection, entry);
    const serializedEntryDraft = { ...entryDraft, entry: serializedEntry };

    dispatch(unpublishedEntryPersisting(collection, entry.slug));
    const persistAction = existingUnpublishedEntry
      ? backend.persistUnpublishedEntry
      : backend.persistEntry;

    try {
      const newSlug = await persistAction.call(backend, {
        config: state.config,
        collection,
        entryDraft: serializedEntryDraft,
        assetProxies,
        usedSlugs,
      });
      dispatch(
        addNotification({
          message: {
            key: 'ui.toast.entrySaved',
          },
          type: 'success',
          dismissAfter: 4000,
        }),
      );
      dispatch(unpublishedEntryPersisted(collection, serializedEntry));
      // Also refreshes relation widget search results, which share the
      // collection tag (DCMS-606). UNPUBLISHED_TAG is deliberately NOT
      // invalidated on local writes: the persist/publish/delete reducers apply
      // the change to the workflow store directly, so a mount-triggered
      // refetch would only repeat a request whose result we already have.
      // Remote edits invalidate it via the freshness controller instead.
      queryCore.invalidateTags([collectionTag(collection.name)]);

      if (entry.slug !== newSlug) {
        await dispatch(loadUnpublishedEntry(collection, newSlug));
        navigateToEntry(collection.name, newSlug);
      }
    } catch (error: unknown) {
      dispatch(
        addNotification({
          message: {
            key: 'ui.toast.onFailToPersist',
            details: error,
          },
          type: 'error',
          dismissAfter: 8000,
        }),
      );
      return Promise.reject(
        dispatch(
          unpublishedEntryPersistedFail(
            error instanceof Error ? error : new Error(String(error)),
            collection,
            entry.slug,
          ),
        ),
      );
    }
  };
}

export function updateUnpublishedEntryStatus(
  collection: string,
  slug: string,
  oldStatus: Status,
  newStatus: Status,
) {
  return (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    if (oldStatus === newStatus) return;
    const state = getState();
    const backend = currentBackend(state.config);
    dispatch(unpublishedEntryStatusChangeRequest(collection, slug));
    // Status transitions are fully predictable, so apply optimistically and roll
    // back to the previous status if the backend rejects.
    dispatch(unpublishedEntryStatusChangePersisted(collection, slug, newStatus));
    return backend
      .updateUnpublishedEntryStatus(collection, slug, newStatus)
      .then(() => {
        dispatch(
          addNotification({
            message: {
              key: 'ui.toast.entryUpdated',
            },
            type: 'success',
            dismissAfter: 4000,
          }),
        );
      })
      .catch((error: Error) => {
        dispatch(unpublishedEntryStatusChangePersisted(collection, slug, oldStatus));
        dispatch(
          addNotification({
            message: {
              key: 'ui.toast.onFailToUpdateStatus',
              details: error,
            },
            type: 'error',
            dismissAfter: 8000,
          }),
        );
        dispatch(unpublishedEntryStatusChangeError(collection, slug));
      });
  };
}

export function deleteUnpublishedEntry(collection: string, slug: string) {
  return (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    dispatch(unpublishedEntryDeleteRequest(collection, slug));
    return backend
      .deleteUnpublishedEntry(collection, slug)
      .then(() => {
        dispatch(
          addNotification({
            message: { key: 'ui.toast.onDeleteUnpublishedChanges' },
            type: 'success',
            dismissAfter: 4000,
          }),
        );
        dispatch(unpublishedEntryDeleted(collection, slug));
        queryCore.invalidateTags([collectionTag(collection)]);
      })
      .catch((error: Error) => {
        dispatch(
          addNotification({
            message: { key: 'ui.toast.onDeleteUnpublishedChanges', details: error },
            type: 'error',
            dismissAfter: 8000,
          }),
        );
        dispatch(unpublishedEntryDeleteError(collection, slug));
      });
  };
}

export function publishUnpublishedEntry(collectionName: string, slug: string) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const collections = state.collections;
    const backend = currentBackend(state.config);
    const entry = selectUnpublishedEntry(state, collectionName, slug) as unknown as EntryMap;
    dispatch(unpublishedEntryPublishRequest(collectionName, slug));
    try {
      await backend.publishUnpublishedEntry(entry);
      // re-load media after entry was published
      dispatch(loadMedia());
      dispatch(
        addNotification({
          message: { key: 'ui.toast.entryPublished' },
          type: 'success',
          dismissAfter: 4000,
        }),
      );
      dispatch(unpublishedEntryPublished(collectionName, slug));
      // Also refreshes relation widget search results, which share the
      // collection tag (DCMS-606).
      queryCore.invalidateTags([
        collectionTag(collectionName),
        entryTag(collectionName, slug),
      ]);
      const collection = collections[collectionName];
      if (collection.nested != null) {
        dispatch(loadEntries(collection));
        const newSlug = slugFromCustomPath(collection, entry.path);
        loadEntry(collection, newSlug);
        if (slug !== newSlug && selectEditingDraft(state.entryDraft)) {
          navigateToEntry(collection.name, newSlug);
        }
      } else {
        return dispatch(loadEntry(collection, slug));
      }
    } catch (error: unknown) {
      dispatch(
        addNotification({
          message: { key: 'ui.toast.onFailToPublishEntry', details: error },
          type: 'error',
          dismissAfter: 8000,
        }),
      );
      dispatch(unpublishedEntryPublishError(collectionName, slug));
    }
  };
}

export function unpublishPublishedEntry(collection: Collection, slug: string) {
  return (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    const entry = selectEntry(state, collection.name, slug) as EntryMap;
    const entryDraft = { entry } as unknown as EntryDraft;
    dispatch(unpublishedEntryPersisting(collection, slug));
    return backend
      .deleteEntry(state, collection, slug)
      .then(() =>
        backend.persistEntry({
          config: state.config,
          collection,
          entryDraft,
          assetProxies: [],
          usedSlugs: [],
          status: status.PENDING_PUBLISH,
        })
      )
      .then(() => {
        dispatch(unpublishedEntryPersisted(collection, entry));
        dispatch(entryDeleted(collection, slug));
        dispatch(loadUnpublishedEntry(collection, slug));
        queryCore.invalidateTags([
          collectionTag(collection.name),
          entryTag(collection.name, slug),
        ]);
        dispatch(
          addNotification({
            message: { key: 'ui.toast.entryUnpublished' },
            type: 'success',
            dismissAfter: 4000,
          }),
        );
      })
      .catch((error: Error) => {
        dispatch(
          addNotification({
            message: { key: 'ui.toast.onFailToUnpublishEntry', details: error },
            type: 'error',
            dismissAfter: 8000,
          }),
        );
        dispatch(unpublishedEntryPersistedFail(error, collection, entry.slug));
      });
  };
}
