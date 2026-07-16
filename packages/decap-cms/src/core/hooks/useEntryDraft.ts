import { useCallback } from 'react';

import {
  changeDraftField,
  changeDraftFieldValidation,
  createDraftDuplicateFromEntry,
  createEmptyDraft,
  discardDraft,
} from '@/core/actions/entries';
import { useAppDispatch, useAppSelector } from './useRedux';

import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@/lib/util/index';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;

/**
 * Hook for entry draft state and actions
 * Replaces connect() mapStateToProps/mapDispatchToProps for draft management
 */
export function useEntryDraft() {
  const dispatch = useAppDispatch();
  const entryDraft = useAppSelector(state => state.entryDraft);

  const hasChanged = entryDraft.hasChanged;
  const draftEntry = entryDraft.entry;
  const fieldsMetaData = entryDraft.fieldsMetaData;
  const fieldsErrors = entryDraft.fieldsErrors;
  const localBackup = entryDraft.localBackup;
  const draftKey = entryDraft.key;
  const isPersisting = draftEntry?.isPersisting;
  const isNewRecord = draftEntry?.newRecord;
  const isModification = entryDraft.entry?.isModification;

  const createEmpty = useCallback(
    (collection: Collection, search?: string) => {
      dispatch(createEmptyDraft(collection, search || ''));
    },
    [dispatch],
  );

  const createDuplicate = useCallback(
    (entry: EntryMap) => {
      dispatch(createDraftDuplicateFromEntry(entry));
    },
    [dispatch],
  );

  const discard = useCallback(() => {
    dispatch(discardDraft());
  }, [dispatch]);

  const changeField = useCallback(
    (params: {
      field: EntryField,
      value: string,
      metadata: Record<string, unknown>,
      entries: EntryMap[],
      i18n?: { currentLocale: string, defaultLocale: string, locales: string[] },
    }) => {
      dispatch(changeDraftField(params));
    },
    [dispatch],
  );

  const validateField = useCallback(
    (field: string, errors: { type: string, parentIds: string[], message: string }[]) => {
      dispatch(changeDraftFieldValidation(field, errors));
    },
    [dispatch],
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
