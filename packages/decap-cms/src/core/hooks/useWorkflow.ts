import { useCallback, useMemo } from 'react';

import { loadUnpublishedEntry, persistUnpublishedEntry } from '@/core/actions/editorialWorkflow';
import { loadEntry as loadEntryAction, persistEntry as persistEntryAction } from '@/core/actions/entries';
import { EDITORIAL_WORKFLOW } from '@/core/constants/publishModes';
import { selectUnpublishedEntry } from '@/core/reducers';
import { selectAllowDeletion } from '@/core/reducers/collections';
import { useAppDispatch, useAppSelector } from './useRedux';

import type { CmsCollectionState } from '@/lib/util/index';

type Collection = CmsCollectionState;

interface UseWorkflowOptions {
  collectionName: string;
  slug?: string;
  newEntry: boolean;
}

export function useWorkflow({ collectionName, slug, newEntry }: UseWorkflowOptions) {
  const dispatch = useAppDispatch();

  const collection = useAppSelector(state => state.collections[collectionName]) as
    | Collection
    | undefined;
  const isEditorialWorkflow = useAppSelector(
    state => state.config.publish_mode === EDITORIAL_WORKFLOW,
  );
  const unpublishedEntry = useAppSelector(state =>
    isEditorialWorkflow && slug ? selectUnpublishedEntry(state, collectionName, slug) : null
  );

  const showDelete = useMemo(() => {
    if (!collection) return false;
    return !newEntry && selectAllowDeletion(collection);
  }, [collection, newEntry]);

  const hasUnpublishedEntry = Boolean(unpublishedEntry);

  // Override loadEntry for editorial workflow
  const loadEntry = useCallback(
    (coll: Collection, entrySlug: string) => {
      if (isEditorialWorkflow) {
        return dispatch(loadUnpublishedEntry(coll, entrySlug) as any);
      }

      return dispatch(loadEntryAction(coll, entrySlug) as any);
    },
    [dispatch, isEditorialWorkflow],
  );

  // Override persistEntry for editorial workflow
  const persistEntry = useCallback(
    (coll: Collection) => {
      if (isEditorialWorkflow) {
        return dispatch(persistUnpublishedEntry(coll, hasUnpublishedEntry) as any);
      }

      return dispatch(persistEntryAction(coll) as any);
    },
    [dispatch, isEditorialWorkflow, hasUnpublishedEntry],
  );

  return {
    isEditorialWorkflow,
    showDelete,
    unpublishedEntry: hasUnpublishedEntry,
    entry: unpublishedEntry,
    loadEntry,
    persistEntry,
  };
}
