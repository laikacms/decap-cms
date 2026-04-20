import { useCallback } from 'react';
import type { Map } from 'immutable';

import { useAppSelector, useAppDispatch } from './useRedux';
import { openMediaLibrary, closeMediaLibrary } from '../actions/mediaLibrary';

import type { EntryField } from '../types/cms';

/**
 * Hook for media library state and actions
 * Replaces connect() mapStateToProps/mapDispatchToProps for media library
 */
export function useMediaLibrary() {
  const dispatch = useAppDispatch();
  const mediaLibrary = useAppSelector(state => state.mediaLibrary);

  const isExternal = mediaLibrary.get('externalLibrary');
  const useMediaLibrary = !isExternal;
  const showMediaButton = mediaLibrary.get('showMediaButton');
  const isOpen = mediaLibrary.get('isVisible');

  const open = useCallback(
    (options?: {
      controlID?: string;
      forImage?: boolean;
      privateUpload?: boolean;
      value?: string;
      allowMultiple?: boolean;
      config?: Map<string, unknown>;
      field?: EntryField;
    }) => {
      dispatch(openMediaLibrary(options));
    },
    [dispatch]
  );

  const close = useCallback(() => {
    dispatch(closeMediaLibrary());
  }, [dispatch]);

  return {
    mediaLibrary,
    isExternal,
    useMediaLibrary,
    showMediaButton,
    isOpen,
    open,
    close,
  };
}
