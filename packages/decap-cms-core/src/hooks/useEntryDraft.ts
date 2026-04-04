import { useCallback } from 'react';

import { useAppSelector, useAppDispatch } from './useRedux';
import {
  createDraftDuplicateFromEntry,
  createEmptyDraft,
  discardDraft,
  changeDraftField,
  changeDraftFieldValidation,
} from '../actions/entries';

/**
 * Hook for entry draft state and actions
 * Replaces connect() mapStateToProps/mapDispatchToProps for draft management
 */
export function useEntryDraft() {
  const dispatch = useAppDispatch();
  const entryDraft = useAppSelector(state => state.entryDraft);

  const hasChanged = entryDraft.get('hasChanged');
  const draftEntry = entryDraft.get('entry');
  const fieldsMetaData = entryDraft.get('fieldsMetaData');
  const fieldsErrors = entryDraft.get('fieldsErrors');
  const localBackup = entryDraft.get('localBackup');
  const draftKey = entryDraft.get('key');
  const isPersisting = draftEntry?.get('isPersisting');
  const isNewRecord = draftEntry?.get('newRecord');
  const isModification = entryDraft.getIn(['entry', 'isModification']);

  const createEmpty = useCallback(
    (collection: unknown, search?: string) => {
      dispatch(createEmptyDraft(collection, search));
    },
    [dispatch]
  );

  const createDuplicate = useCallback(
    (entry: unknown) => {
      dispatch(createDraftDuplicateFromEntry(entry));
    },
    [dispatch]
  );

  const discard = useCallback(() => {
    dispatch(discardDraft());
  }, [dispatch]);

  const changeField = useCallback(
    (params: { field: unknown; value: unknown; metadata?: unknown; entries?: unknown[]; i18n?: unknown }) => {
      dispatch(changeDraftField(params));
    },
    [dispatch]
  );

  const validateField = useCallback(
    (field: unknown, errors: unknown) => {
      dispatch(changeDraftFieldValidation(field, errors));
    },
    [dispatch]
  );

  return {
    entryDraft,
    hasChanged,
    draftEntry,
    fieldsMetaData,
    fieldsErrors,
    localBackup,
    draftKey,
    isPersisting,
    isNewRecord,
    isModification,
    createEmpty,
    createDuplicate,
    discard,
    changeField,
    validateField,
  };
}
