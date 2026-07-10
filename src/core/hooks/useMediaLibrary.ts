import { useCallback } from 'react';

import { useAppSelector, useAppDispatch } from './useRedux';
import { openMediaLibrary, closeMediaLibrary } from '../actions/mediaLibrary';

import type { CmsEntryField } from '../../lib/util/index';

type EntryField = CmsEntryField;

/**
 * Hook for media library state and actions
 * Replaces connect() mapStateToProps/mapDispatchToProps for media library
 */
export function useMediaLibrary() {
  const dispatch = useAppDispatch();
  const mediaLibrary = useAppSelector(state => state.mediaLibrary);

  const isExternal = mediaLibrary.externalLibrary;
  const useMediaLibrary = !isExternal;
  const showMediaButton = mediaLibrary.showMediaButton;
  const isOpen = mediaLibrary.isVisible;

  const open = useCallback(
    (options?: {
      controlID?: string;
      forImage?: boolean;
      privateUpload?: boolean;
      value?: string;
      allowMultiple?: boolean;
      config?: Record<string, unknown>;
      field?: EntryField;
    }) => {
      dispatch(openMediaLibrary(options));
    },
    [dispatch],
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
