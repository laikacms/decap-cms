import { useCallback } from 'react';

import { useAppSelector, useAppDispatch } from './useRedux';
import { loadEntry, loadEntries, persistEntry, deleteEntry } from '../actions/entries';
import {
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  unpublishPublishedEntry,
  deleteUnpublishedEntry,
} from '../actions/editorialWorkflow';
import { loadDeployPreview } from '../actions/deploys';
import { selectEntry, selectUnpublishedEntry, selectDeployPreview } from '../reducers';
import { selectFields } from '../reducers/collections';
import { status } from '../constants/publishModes';
import { navigateToCollection, navigateToNewEntry } from '../routing/navigation';

import type { Status } from '../constants/publishModes';
import type { CmsEntry } from '../../lib-util/index';
type Entry = CmsEntry;

interface UseEntryOptions {
  collectionName: string;
  slug?: string;
  newEntry?: boolean;
}

/**
 * Hook for entry state and actions
 * Replaces connect() mapStateToProps/mapDispatchToProps for Editor component
 */
export function useEntry({ collectionName, slug, newEntry = false }: UseEntryOptions) {
  const dispatch = useAppDispatch();
  const collections = useAppSelector(state => state.collections);
  const entries = useAppSelector(state => state.entries);
  const config = useAppSelector(state => state.config);

  const collection = collections[collectionName];
  const fields = selectFields(collection, slug || '');

  const entry = newEntry
    ? null
    : selectEntry({ collections, entries, config } as any, collectionName, slug || '');

  const unpublishedEntry = selectUnpublishedEntry(
    { editorialWorkflow: useAppSelector(state => state.editorialWorkflow) } as any,
    collectionName,
    slug || '',
  );

  const deployPreview = selectDeployPreview(
    { deploys: useAppSelector(state => state.deploys) } as any,
    collectionName,
    slug || '',
  );
  const collectionEntriesLoaded = !!entries.pages?.[collectionName];
  const currentStatus = unpublishedEntry?.status as Status | undefined;
  const isPublished = !newEntry && !unpublishedEntry;

  const load = useCallback(() => {
    if (collection && slug) {
      dispatch(loadEntry(collection, slug));
    }
  }, [dispatch, collection, slug]);

  const loadAll = useCallback(() => {
    if (collection) {
      dispatch(loadEntries(collection));
    }
  }, [dispatch, collection]);

  const persist = useCallback(async () => {
    if (collection) {
      try {
        await dispatch(persistEntry(collection));
      } catch {
        // Validation rejection is already surfaced as a notification.
      }
    }
  }, [dispatch, collection]);

  const remove = useCallback(async () => {
    if (collection && slug) {
      await dispatch(deleteEntry(collection, slug));
      navigateToCollection(collectionName);
    }
  }, [dispatch, collection, slug, collectionName]);

  const updateStatus = useCallback(
    (newStatusName: string) => {
      if (collection && slug && currentStatus) {
        const newStatus = (status as unknown as Record<string, string>)[newStatusName] as
          | Status
          | undefined;
        if (newStatus) {
          dispatch(updateUnpublishedEntryStatus(collectionName, slug, currentStatus, newStatus));
        }
      }
    },
    [dispatch, collection, slug, currentStatus, collectionName],
  );

  const publish = useCallback(async () => {
    if (slug) {
      await dispatch(publishUnpublishedEntry(collectionName, slug));
    }
  }, [dispatch, collectionName, slug]);

  const unpublish = useCallback(async () => {
    if (collection && slug) {
      await dispatch(unpublishPublishedEntry(collection, slug));
      navigateToCollection(collectionName);
    }
  }, [dispatch, collection, slug, collectionName]);

  const deleteUnpublished = useCallback(async () => {
    if (slug) {
      await dispatch(deleteUnpublishedEntry(collectionName, slug));
    }
  }, [dispatch, collectionName, slug]);

  const loadPreview = useCallback(
    (opts?: { maxAttempts?: number; interval?: number; signal?: AbortSignal }) => {
      if (collection && slug && entry) {
        dispatch(loadDeployPreview(collection, slug, entry as unknown as Entry, isPublished, opts));
      }
    },
    [dispatch, collection, slug, entry, isPublished],
  );

  const navigateToNew = useCallback(() => {
    navigateToNewEntry(collectionName);
  }, [collectionName]);

  const navigateToList = useCallback(() => {
    navigateToCollection(collectionName);
  }, [collectionName]);

  return {
    collection,
    collections,
    fields,
    entry,
    unpublishedEntry,
    deployPreview,
    collectionEntriesLoaded,
    currentStatus,
    isPublished,
    isNewEntry: newEntry,
    load,
    loadAll,
    persist,
    remove,
    updateStatus,
    publish,
    unpublish,
    deleteUnpublished,
    loadPreview,
    navigateToNew,
    navigateToList,
  };
}
