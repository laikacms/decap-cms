import { useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';

import { useAppDispatch, useAppSelector } from './useRedux';
import { useWorkflow } from './useWorkflow';
import { useTranslate } from './useTranslate';
import { history, navigateToCollection, navigateToNewEntry } from '../routing/history';
import { logoutUser } from '../actions/auth';
import {
  loadEntry,
  loadEntries,
  createDraftDuplicateFromEntry,
  createEmptyDraft,
  discardDraft,
  changeDraftField,
  changeDraftFieldValidation,
  persistEntry,
  deleteEntry,
  persistLocalBackup,
  loadLocalBackup,
  retrieveLocalBackup,
  deleteLocalBackup,
} from '../actions/entries';
import {
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  unpublishPublishedEntry,
  deleteUnpublishedEntry,
} from '../actions/editorialWorkflow';
import { loadDeployPreview } from '../actions/deploys';
import { selectEntry, selectUnpublishedEntry, selectDeployPreview } from '../reducers';
import { selectFields } from '../reducers/collections';
import { status, EDITORIAL_WORKFLOW } from '../constants/publishModes';

import type { Status } from '../constants/publishModes';
import type { Update, Transition } from 'history';
import type { Collection, Entry, EntryDraft } from '../types/cms';

interface UseEditorOptions {
  collectionName: string;
  slug?: string;
  newEntry: boolean;
  locationSearch: string;
  locationPathname: string;
}

interface EditorSetupResult {
  cleanup: () => void;
}

export function useEditor({
  collectionName,
  slug,
  newEntry,
  locationSearch,
  locationPathname,
}: UseEditorOptions) {
  const dispatch = useAppDispatch();
  const t = useTranslate();
  
  // Refs for cleanup functions
  const exitBlockerRef = useRef<((event: BeforeUnloadEvent) => string | undefined) | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const unblockRef = useRef<(() => void) | null>(null);
  
  // Selectors
  const collections = useAppSelector(state => state.collections);
  const collection = useAppSelector(state => state.collections.get(collectionName)) as Collection | undefined;
  const entryDraft = useAppSelector(state => state.entryDraft) as EntryDraft | undefined;
  const user = useAppSelector(state => state.auth.user);
  const displayUrl = useAppSelector(state => state.config.display_url);
  const hasWorkflow = useAppSelector(state => state.config.publish_mode === EDITORIAL_WORKFLOW);
  const useOpenAuthoring = useAppSelector(state => state.globalUI.useOpenAuthoring);
  const collectionEntriesLoaded = useAppSelector(state => !!state.entries.getIn(['pages', collectionName]));
  
  const entry = useAppSelector(state => 
    newEntry ? null : selectEntry(state, collectionName, slug || '')
  ) as Entry | null;
  
  const unPublishedEntry = useAppSelector(state => 
    selectUnpublishedEntry(state, collectionName, slug || '')
  );
  
  const publishedEntry = useAppSelector(state => 
    selectEntry(state, collectionName, slug || '')
  ) as Entry | null;
  
  const deployPreview = useAppSelector(state => 
    selectDeployPreview(state, collectionName, slug || '')
  );
  
  // Workflow hook
  const workflow = useWorkflow({ collectionName, slug, newEntry });
  
  // Derived state
  const hasChanged = entryDraft?.get('hasChanged') as boolean | undefined;
  const isModification = entryDraft?.getIn(['entry', 'isModification']) as boolean | undefined;
  const localBackup = entryDraft?.get('localBackup');
  const draftKey = entryDraft?.get('key');
  const currentStatus = unPublishedEntry?.get('status') as Status | undefined;
  
  const fields = useMemo(() => {
    if (!collection) return null;
    return selectFields(collection, slug || '');
  }, [collection, slug]);
  
  const editorBackLink = useMemo(() => {
    let link = `/collections/${collectionName}`;
    if (new URLSearchParams(locationSearch).get('ref') === 'workflow') {
      link = `/workflow`;
    }
    if (collection?.has('nested') && slug) {
      const pathParts = slug.split('/');
      if (pathParts.length > 2) {
        link = `${link}/filter/${pathParts.slice(0, -2).join('/')}`;
      }
    }
    return link;
  }, [collectionName, locationSearch, collection, slug]);
  
  // Debounced backup creation
  const createBackup = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debounce((entryData: any, coll: Collection) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch(persistLocalBackup(entryData, coll) as any);
      }, 2000),
    [dispatch]
  );
  
  // Delete backup helper
  const deleteBackup = useCallback(() => {
    if (!collection) return;
    createBackup.cancel();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(deleteLocalBackup(collection, (!newEntry && slug) || '') as any);
  }, [dispatch, collection, newEntry, slug, createBackup]);
  
  // Setup function - call this on mount
  const setup = useCallback((): EditorSetupResult => {
    if (!collection) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return { cleanup: () => {} };
    }
    
    // Retrieve local backup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(retrieveLocalBackup(collection, slug || '') as any);
    
    // Create empty draft or load entry
    if (newEntry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(createEmptyDraft(collection, locationSearch) as any);
    } else if (slug) {
      workflow.loadEntry(collection, slug);
    }
    
    // Load collection entries if not loaded
    if (!collectionEntriesLoaded) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(loadEntries(collection) as any);
    }
    
    const leaveMessage = t('editor.editor.onLeavePage');
    
    // Setup beforeunload handler
    function exitBlocker(event: BeforeUnloadEvent) {
      const draft = entryDraft;
      if (draft?.get('hasChanged')) {
        event.returnValue = leaveMessage;
        return leaveMessage;
      }
      return undefined;
    }
    exitBlockerRef.current = exitBlocker;
    window.addEventListener('beforeunload', exitBlocker);
    
    // Setup navigation blocker (history v5 API)
    function navigationBlocker(tx: Transition) {
      const draft = entryDraft;
      const isPersisting = draft?.getIn(['entry', 'isPersisting']);
      const newRecord = draft?.getIn(['entry', 'newRecord']);
      const newEntryPath = `/collections/${collection!.get('name')}/new`;
      
      if (
        isPersisting &&
        newRecord &&
        locationPathname === newEntryPath &&
        tx.action === 'PUSH'
      ) {
        tx.retry();
        return;
      }
      
      if (draft?.get('hasChanged')) {
        if (window.confirm(leaveMessage)) {
          tx.retry();
        }
        return;
      }
      
      tx.retry();
    }
    
    const unblock = history.block(navigationBlocker);
    unblockRef.current = unblock;
    
    // Setup history listener (history v5 API: listener receives { location, action })
    const unlisten = history.listen(({ location, action }: Update) => {
      const newEntryPath = `/collections/${collection!.get('name')}/new`;
      const entriesPath = `/collections/${collection!.get('name')}/entries/`;
      const { pathname } = location;
      
      if (
        pathname.startsWith(newEntryPath) ||
        (pathname.startsWith(entriesPath) && action === 'PUSH')
      ) {
        return;
      }
      
      deleteBackup();
      unblock();
      unlisten();
    });
    unlistenRef.current = unlisten;
    
    return {
      cleanup: () => {
        createBackup.flush();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch(discardDraft() as any);
        if (exitBlockerRef.current) {
          window.removeEventListener('beforeunload', exitBlockerRef.current);
        }
        if (unblockRef.current) {
          unblockRef.current();
        }
        if (unlistenRef.current) {
          unlistenRef.current();
        }
      },
    };
  }, [
    collection,
    collectionEntriesLoaded,
    createBackup,
    deleteBackup,
    dispatch,
    entryDraft,
    locationPathname,
    locationSearch,
    newEntry,
    slug,
    t,
    workflow,
  ]);
  
  // Handle local backup confirmation
  const handleLocalBackupCheck = useCallback(
    (prevLocalBackup: unknown) => {
      if (!prevLocalBackup && localBackup) {
        const confirmLoadBackup = window.confirm(t('editor.editor.confirmLoadBackup'));
        if (confirmLoadBackup) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch(loadLocalBackup() as any);
        } else {
          deleteBackup();
        }
      }
    },
    [localBackup, t, dispatch, deleteBackup]
  );
  
  // Handle backup creation when changed
  const handleBackupOnChange = useCallback(() => {
    if (hasChanged && entryDraft && collection) {
      createBackup(entryDraft.get('entry'), collection);
    }
  }, [hasChanged, entryDraft, collection, createBackup]);
  
  // Handle entry change (for componentDidUpdate logic)
  const handleEntryChange = useCallback(
    (prevEntry: unknown) => {
      if (prevEntry === entry) return;
      
      if (newEntry && collection) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch(createEmptyDraft(collection, locationSearch) as any);
      }
    },
    [entry, newEntry, collection, locationSearch, dispatch]
  );
  
  // Event handlers
  const handleChangeDraftField = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (field: any, value: any, metadata: any, i18n: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries = [unPublishedEntry, publishedEntry].filter(Boolean) as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(changeDraftField({ field, value, metadata, entries, i18n }) as any);
    },
    [dispatch, unPublishedEntry, publishedEntry]
  );
  
  const handleChangeStatus = useCallback(
    (newStatusName: string) => {
      if (!collection || !slug || !currentStatus) return;
      
      if (entryDraft?.get('hasChanged')) {
        window.alert(t('editor.editor.onUpdatingWithUnsavedChanges'));
        return;
      }
      const newStatus = status.get(newStatusName) as Status | undefined;
      if (newStatus) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch(updateUnpublishedEntryStatus(collection.get('name'), slug, currentStatus, newStatus) as any);
      }
    },
    [collection, slug, entryDraft, currentStatus, t, dispatch]
  );
  
  const handlePersistEntry = useCallback(
    async (opts: { createNew?: boolean; duplicate?: boolean } = {}) => {
      const { createNew = false, duplicate = false } = opts;
      if (!collection) return;
      
      await workflow.persistEntry(collection);
      deleteBackup();
      
      if (createNew) {
        navigateToNewEntry(collection.get('name'));
        if (duplicate && entryDraft) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch(createDraftDuplicateFromEntry(entryDraft.get('entry')) as any);
        }
      } else if (slug && hasWorkflow && !currentStatus) {
        workflow.loadEntry(collection, slug);
      }
    },
    [collection, workflow, deleteBackup, entryDraft, slug, hasWorkflow, currentStatus, dispatch]
  );
  
  const handlePublishEntry = useCallback(
    async (opts: { createNew?: boolean; duplicate?: boolean } = {}) => {
      const { createNew = false, duplicate = false } = opts;
      if (!collection || !slug) return;
      
      if (currentStatus !== status.last()) {
        window.alert(t('editor.editor.onPublishingNotReady'));
        return;
      } else if (entryDraft?.get('hasChanged')) {
        window.alert(t('editor.editor.onPublishingWithUnsavedChanges'));
        return;
      } else if (!window.confirm(t('editor.editor.onPublishing'))) {
        return;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await dispatch(publishUnpublishedEntry(collection.get('name'), slug) as any);
      deleteBackup();
      
      if (createNew) {
        navigateToNewEntry(collection.get('name'));
      }
      
      if (duplicate && entryDraft) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch(createDraftDuplicateFromEntry(entryDraft.get('entry')) as any);
      }
    },
    [collection, slug, currentStatus, entryDraft, t, dispatch, deleteBackup]
  );
  
  const handleUnpublishEntry = useCallback(async () => {
    if (!collection || !slug) return;
    
    if (!window.confirm(t('editor.editor.onUnpublishing'))) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dispatch(unpublishPublishedEntry(collection, slug) as any);
    return navigateToCollection(collection.get('name'));
  }, [collection, slug, t, dispatch]);
  
  const handleDuplicateEntry = useCallback(() => {
    if (!collection || !entryDraft) return;
    
    navigateToNewEntry(collection.get('name'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(createDraftDuplicateFromEntry(entryDraft.get('entry')) as any);
  }, [collection, entryDraft, dispatch]);
  
  const handleDeleteEntry = useCallback(() => {
    if (!collection) return;
    
    if (entryDraft?.get('hasChanged')) {
      if (!window.confirm(t('editor.editor.onDeleteWithUnsavedChanges'))) {
        return;
      }
    } else if (!window.confirm(t('editor.editor.onDeletePublishedEntry'))) {
      return;
    }
    
    if (newEntry) {
      return navigateToCollection(collection.get('name'));
    }
    
    setTimeout(async () => {
      if (slug) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await dispatch(deleteEntry(collection, slug) as any);
      }
      deleteBackup();
      return navigateToCollection(collection.get('name'));
    }, 0);
  }, [collection, entryDraft, newEntry, slug, t, dispatch, deleteBackup]);
  
  const handleDeleteUnpublishedChanges = useCallback(async () => {
    if (!collection || !slug) return;
    
    if (
      entryDraft?.get('hasChanged') &&
      !window.confirm(t('editor.editor.onDeleteUnpublishedChangesWithUnsavedChanges'))
    ) {
      return;
    } else if (!window.confirm(t('editor.editor.onDeleteUnpublishedChanges'))) {
      return;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dispatch(deleteUnpublishedEntry(collection.get('name'), slug) as any);
    deleteBackup();
    
    if (isModification) {
      workflow.loadEntry(collection, slug);
    } else {
      navigateToCollection(collection.get('name'));
    }
  }, [collection, slug, entryDraft, isModification, t, dispatch, deleteBackup, workflow]);
  
  const handleLogout = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(logoutUser() as any);
  }, [dispatch]);
  
  const handleLoadDeployPreview = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (opts?: any) => {
      if (!collection || !entry || !slug) return;
      const isPublished = !newEntry && !workflow.unpublishedEntry;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(loadDeployPreview(collection, slug, entry as unknown as Entry, isPublished, opts) as any);
    },
    [collection, slug, entry, newEntry, workflow.unpublishedEntry, dispatch]
  );
  
  const handleValidate = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (field: any, errors: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(changeDraftFieldValidation(field, errors) as any);
    },
    [dispatch]
  );
  
  return {
    // State
    collection,
    collections,
    entry,
    entryDraft,
    fields,
    user,
    hasChanged,
    displayUrl,
    hasWorkflow,
    useOpenAuthoring,
    isModification,
    currentStatus,
    deployPreview,
    localBackup,
    draftKey,
    editorBackLink,
    newEntry,
    slug,
    unpublishedEntry: workflow.unpublishedEntry,
    showDelete: workflow.showDelete,
    
    // Setup/lifecycle
    setup,
    handleLocalBackupCheck,
    handleBackupOnChange,
    handleEntryChange,
    
    // Event handlers
    handleChangeDraftField,
    handleChangeStatus,
    handlePersistEntry,
    handlePublishEntry,
    handleUnpublishEntry,
    handleDuplicateEntry,
    handleDeleteEntry,
    handleDeleteUnpublishedChanges,
    handleLogout,
    handleLoadDeployPreview,
    handleValidate,
    
    // Translation
    t,
  };
}
