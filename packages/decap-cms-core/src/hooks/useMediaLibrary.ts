import { useCallback } from 'react';

import { useAppSelector, useAppDispatch } from './useRedux';
import { openMediaLibrary, closeMediaLibrary } from '../actions/mediaLibrary';

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
    (options?: unknown) => {
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
