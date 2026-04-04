import { useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';

import { useAppDispatch } from './useRedux';
import {
  persistLocalBackup,
  loadLocalBackup,
  retrieveLocalBackup,
  deleteLocalBackup,
} from '../actions/entries';

interface UseLocalBackupOptions {
  collection: unknown;
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
    debounce((entry: unknown, col: unknown) => {
      dispatch(persistLocalBackup(entry, col));
    }, debounceMs)
  );

  const retrieve = useCallback(() => {
    dispatch(retrieveLocalBackup(collection, slug));
  }, [dispatch, collection, slug]);

  const load = useCallback(() => {
    dispatch(loadLocalBackup());
  }, [dispatch]);

  const persist = useCallback(
    (entry: unknown) => {
      debouncedPersistRef.current(entry, collection);
    },
    [collection]
  );

  const remove = useCallback(() => {
    debouncedPersistRef.current.cancel();
    dispatch(deleteLocalBackup(collection, slug));
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
