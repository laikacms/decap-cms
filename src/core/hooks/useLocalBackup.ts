import { useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';

import { useAppDispatch } from './useRedux';
import {
  persistLocalBackup,
  loadLocalBackup,
  retrieveLocalBackup,
  deleteLocalBackup,
} from '@/core/actions/entries';

import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;

interface UseLocalBackupOptions {
  collection: Collection;
  slug?: string;
  debounceMs?: number;
}

/**
 * Hook for managing local entry backups
 * Replaces the backup logic in Editor component
 */
export function useLocalBackup({ collection, slug, debounceMs = 2000 }: UseLocalBackupOptions) {
  const dispatch = useAppDispatch();

  // Create debounced persist function
  const debouncedPersistRef = useRef(
    debounce((entry: EntryMap, col: Collection) => {
      dispatch(persistLocalBackup(entry, col));
    }, debounceMs),
  );

  const retrieve = useCallback(() => {
    dispatch(retrieveLocalBackup(collection, slug || ''));
  }, [dispatch, collection, slug]);

  const load = useCallback(() => {
    dispatch(loadLocalBackup());
  }, [dispatch]);

  const persist = useCallback(
    (entry: EntryMap) => {
      debouncedPersistRef.current(entry, collection);
    },
    [collection],
  );

  const remove = useCallback(() => {
    debouncedPersistRef.current.cancel();
    dispatch(deleteLocalBackup(collection, slug || ''));
  }, [dispatch, collection, slug]);

  const flush = useCallback(() => {
    debouncedPersistRef.current.flush();
  }, []);

  const cancel = useCallback(() => {
    debouncedPersistRef.current.cancel();
  }, []);

  return {
    retrieve,
    load,
    persist,
    remove,
    flush,
    cancel,
  };
}
