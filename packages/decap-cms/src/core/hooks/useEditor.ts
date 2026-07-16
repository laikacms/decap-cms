import { debounce } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { logoutUser } from '@/core/actions/auth';
import { loadDeployPreview } from '@/core/actions/deploys';
import {
  deleteUnpublishedEntry,
  publishUnpublishedEntry,
  unpublishPublishedEntry,
  updateUnpublishedEntryStatus,
} from '@/core/actions/editorialWorkflow';
import {
  changeDraftField,
  changeDraftFieldValidation,
  createDraftDuplicateFromEntry,
  createEmptyDraft,
  deleteEntry,
  deleteLocalBackup,
  discardDraft,
  loadEntries,
  loadEntry,
  loadLocalBackup,
  persistEntry,
  persistLocalBackup,
  retrieveLocalBackup,
} from '@/core/actions/entries';
import { EDITORIAL_WORKFLOW, status } from '@/core/constants/publishModes';
import { selectDeployPreview, selectEntry, selectUnpublishedEntry } from '@/core/reducers';
import { selectFields } from '@/core/reducers/collections';
import { useRouter } from '@/core/routing/context';
import { navigateToCollection, navigateToNewEntry } from '@/core/routing/navigation';
import { showAlert } from '@/ui/AlertDialog';
import { useAppDispatch, useAppSelector } from './useRedux';
import { useTranslate } from './useTranslate';
import { useWorkflow } from './useWorkflow';

import type { Status } from '@/core/constants/publishModes';
import type { RouterTransition, RouterUpdate } from '@/core/routing/router';
import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';

type Collection = CmsCollectionState;
type Entry = CmsEntry;

type EntryDraft = any;

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
  const router = useRouter();

  // Refs for cleanup functions
  const exitBlockerRef = useRef<((event: BeforeUnloadEvent) => string | undefined) | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const unblockRef = useRef<(() => void) | null>(null);
  // The blocker function itself (stable per edit session, defined once in
  // `setup()`), separate from whether it's currently *armed* on the router —
  // see the `hasChanged`-keyed effect below, which owns arming/disarming.
  const navigationBlockerRef = useRef<((tx: RouterTransition) => void) | null>(null);

  // Selectors
  const collections = useAppSelector(state => state.collections);
  const collection = useAppSelector(state => state.collections[collectionName]) as
    | Collection
    | undefined;
  const entryDraft = useAppSelector(state => state.entryDraft) as EntryDraft | undefined;

  // `setup()` below (and the `exitBlocker`/`navigationBlocker`/`handleHashChange`
  // closures it creates) is intentionally invoked once per edited-entry, not on
  // every render — see the `editKey`-keyed effect in `Editor.tsx`. Reading
  // `entryDraft` directly inside those closures would therefore freeze the
  // unsaved-changes guard to whatever the draft was at mount (typically
  // `hasChanged: false`, before the user has typed anything), so every guard
  // path silently treats the entry as clean forever regardless of later edits
  // (DCMS-456). Route every guard read through this ref instead, kept current
  // on every render, so the guards always see the live draft.
  const entryDraftRef = useRef<EntryDraft | undefined>(entryDraft);
  useEffect(() => {
    entryDraftRef.current = entryDraft;
  }, [entryDraft]);
  const user = useAppSelector(state => state.auth.user);
  const displayUrl = useAppSelector(state => state.config.display_url);
  const hasWorkflow = useAppSelector(state => state.config.publish_mode === EDITORIAL_WORKFLOW);
  const useOpenAuthoring = useAppSelector(state => state.globalUI.useOpenAuthoring);
  const collectionEntriesLoaded = useAppSelector(state => !!state.entries.pages?.[collectionName]);

  const entry = useAppSelector(state => newEntry ? null : selectEntry(state, collectionName, slug || '')) as
    | Entry
    | null;

  const unPublishedEntry = useAppSelector(state => selectUnpublishedEntry(state, collectionName, slug || ''));

  const publishedEntry = useAppSelector(state => selectEntry(state, collectionName, slug || '')) as Entry | null;

  const deployPreview = useAppSelector(state => selectDeployPreview(state, collectionName, slug || ''));

  // Workflow hook
  const workflow = useWorkflow({ collectionName, slug, newEntry });

  // Derived state
  const hasChanged = entryDraft?.hasChanged as boolean | undefined;
  const isModification = entryDraft?.entry?.isModification as boolean | undefined;
  const localBackup = entryDraft?.localBackup;
  const draftKey = entryDraft?.key;
  const currentStatus = unPublishedEntry?.status as Status | undefined;

  const fields = useMemo(() => {
    if (!collection) return null;
    return selectFields(collection, slug || '');
  }, [collection, slug]);

  const editorBackLink = useMemo(() => {
    let link = `/collections/${collectionName}`;
    if (new URLSearchParams(locationSearch).get('ref') === 'workflow') {
      link = `/workflow`;
    }
    if (collection?.nested && slug) {
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
      debounce((entryData: any, coll: Collection) => {
        dispatch(persistLocalBackup(entryData, coll) as any);
      }, 2000),
    [dispatch],
  );

  // Delete backup helper
  const deleteBackup = useCallback(() => {
    if (!collection) return;
    createBackup.cancel();

    dispatch(deleteLocalBackup(collection, (!newEntry && slug) || '') as any);
  }, [dispatch, collection, newEntry, slug, createBackup]);

  // Setup function - call this on mount
  const setup = useCallback((): EditorSetupResult => {
    if (!collection) {
      return { cleanup: () => {} };
    }

    // Retrieve local backup

    dispatch(retrieveLocalBackup(collection, slug || '') as any);

    // Create empty draft or load entry
    if (newEntry) {
      dispatch(createEmptyDraft(collection, locationSearch) as any);
    } else if (slug) {
      workflow.loadEntry(collection, slug);
    }

    // Load collection entries if not loaded
    if (!collectionEntriesLoaded) {
      dispatch(loadEntries(collection) as any);
    }

    const leaveMessage = t('editor.editor.onLeavePage');

    // Setup beforeunload handler
    function exitBlocker(event: BeforeUnloadEvent) {
      const draft = entryDraftRef.current;
      if (draft?.hasChanged) {
        event.returnValue = leaveMessage;
        return leaveMessage;
      }
      return undefined;
    }
    exitBlockerRef.current = exitBlocker;
    window.addEventListener('beforeunload', exitBlocker);

    // Setup navigation blocker (router.block covers PUSH/REPLACE and POP-type
    // navigation alike; a blocked POP's URL change is reverted before the
    // blocker runs).
    // Note: The blocker prevents navigation by default. We only call tx.retry()
    // when we want to allow the navigation to proceed.
    // IMPORTANT: We must unblock BEFORE calling tx.retry() to prevent infinite loops,
    // because tx.retry() re-triggers the navigation which would call this blocker again.
    function navigationBlocker(tx: RouterTransition) {
      const draft = entryDraftRef.current;
      const isPersisting = draft?.entry?.isPersisting;
      const newRecord = draft?.entry?.newRecord;
      const newEntryPath = `/collections/${collection!.name}/new`;

      // Allow navigation during persist of new entry
      if (isPersisting && newRecord && locationPathname === newEntryPath && tx.action === 'PUSH') {
        unblockRef.current?.();
        tx.retry();
        return;
      }

      // Block navigation if there are unsaved changes (unless user confirms)
      if (draft?.hasChanged) {
        if (window.confirm(leaveMessage)) {
          unblockRef.current?.();
          tx.retry();
        }
        // If user cancels, do nothing - navigation is already blocked
        return;
      }

      // No unsaved changes - allow navigation
      unblockRef.current?.();
      tx.retry();
    }

    // `navigationBlocker` is only *armed* on the router while the draft is
    // actually dirty — see the `hasChanged`-keyed effect below. Keeping it
    // armed unconditionally for the whole edit session would make `block()`
    // intercept every navigation attempt, including plain PUSH/REPLACE ones
    // this guard was always going to allow through immediately, and would run
    // the router's revert-then-retry dance for every browser back/forward
    // even with nothing to protect. Only arming while dirty keeps clean-draft
    // navigation on the fast path.
    navigationBlockerRef.current = navigationBlocker;

    // Setup navigation listener (receives { location, action } on every navigation)
    const unlisten = router.subscribe(({ location, action }: RouterUpdate) => {
      const newEntryPath = `/collections/${collection!.name}/new`;
      const entriesPath = `/collections/${collection!.name}/entries/`;
      const { pathname } = location;

      if (
        pathname.startsWith(newEntryPath)
        || (pathname.startsWith(entriesPath) && action === 'PUSH')
      ) {
        return;
      }

      deleteBackup();
      unblockRef.current?.();
      unblockRef.current = null;
      unlisten();
    });
    unlistenRef.current = unlisten;

    return {
      cleanup: () => {
        createBackup.flush();

        dispatch(discardDraft() as any);
        if (exitBlockerRef.current) {
          window.removeEventListener('beforeunload', exitBlockerRef.current);
        }
        if (unblockRef.current) {
          unblockRef.current();
          unblockRef.current = null;
        }
        navigationBlockerRef.current = null;
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
    locationPathname,
    locationSearch,
    newEntry,
    router,
    slug,
    t,
    workflow,
  ]);

  // Arm the navigation blocker on the router only while there are unsaved
  // changes to protect, and disarm it the moment they're gone (saved,
  // discarded, or navigated away from). This keeps the common
  // pristine-editing case on the fast path: an un-armed blocker means
  // POP-type navigation (browser back/forward, direct hash edits) applies
  // directly instead of going through the router's revert-then-retry
  // interception. `navigationBlockerRef` is set once per edit session in
  // `setup()` above; this effect only toggles whether it's installed.
  useEffect(() => {
    if (!collection) return;

    if (hasChanged) {
      if (!unblockRef.current && navigationBlockerRef.current) {
        // `block` is optional on the Router port; without it the guard
        // degrades to the `beforeunload` handler installed in `setup()`.
        unblockRef.current = router.block?.(navigationBlockerRef.current) ?? null;
      }
    } else {
      unblockRef.current?.();
      unblockRef.current = null;
    }
  }, [hasChanged, collection, router]);

  // Handle local backup confirmation
  const handleLocalBackupCheck = useCallback(
    (prevLocalBackup: unknown) => {
      if (!prevLocalBackup && localBackup) {
        const confirmLoadBackup = window.confirm(t('editor.editor.confirmLoadBackup'));
        if (confirmLoadBackup) {
          dispatch(loadLocalBackup() as any);
        } else {
          deleteBackup();
        }
      }
    },
    [localBackup, t, dispatch, deleteBackup],
  );

  // Handle backup creation when changed
  const handleBackupOnChange = useCallback(() => {
    if (hasChanged && entryDraft && collection) {
      createBackup(entryDraft.entry, collection);
    }
  }, [hasChanged, entryDraft, collection, createBackup]);

  // Handle entry change (for componentDidUpdate logic)
  const handleEntryChange = useCallback(
    (prevEntry: unknown) => {
      if (prevEntry === entry) return;

      if (newEntry && collection) {
        dispatch(createEmptyDraft(collection, locationSearch) as any);
      }
    },
    [entry, newEntry, collection, locationSearch, dispatch],
  );

  // Event handlers
  const handleChangeDraftField = useCallback(
    (field: any, value: any, metadata: any, i18n: any) => {
      const entries = [unPublishedEntry, publishedEntry].filter(Boolean) as any[];

      dispatch(changeDraftField({ field, value, metadata, entries, i18n }) as any);
    },
    [dispatch, unPublishedEntry, publishedEntry],
  );

  const handleChangeStatus = useCallback(
    (newStatusName: string) => {
      if (!collection || !slug || !currentStatus) return;

      if (entryDraft?.hasChanged) {
        showAlert(t('editor.editor.onUpdatingWithUnsavedChanges'));
        return;
      }
      const newStatus = (status as unknown as Record<string, string>)[newStatusName] as
        | Status
        | undefined;
      if (newStatus) {
        dispatch(
          updateUnpublishedEntryStatus(collection.name, slug, currentStatus, newStatus) as any,
        );
      }
    },
    [collection, slug, entryDraft, currentStatus, t, dispatch],
  );

  const handlePersistEntry = useCallback(
    async (opts: { createNew?: boolean, duplicate?: boolean } = {}) => {
      const { createNew = false, duplicate = false } = opts;
      if (!collection) return;

      try {
        await workflow.persistEntry(collection);
      } catch {
        // The persist action rejects when validation fails (and shows a
        // notification itself). Stop here so we don't delete the draft
        // backup or navigate away.
        return;
      }
      deleteBackup();

      if (createNew) {
        navigateToNewEntry(collection.name);
        if (duplicate && entryDraft) {
          dispatch(createDraftDuplicateFromEntry(entryDraft.entry) as any);
        }
      } else if (slug && hasWorkflow && !currentStatus) {
        workflow.loadEntry(collection, slug);
      }
    },
    [collection, workflow, deleteBackup, entryDraft, slug, hasWorkflow, currentStatus, dispatch],
  );

  const handlePublishEntry = useCallback(
    async (opts: { createNew?: boolean, duplicate?: boolean } = {}) => {
      const { createNew = false, duplicate = false } = opts;
      if (!collection) return;

      // Simple mode has no workflow status to gate on - "publish" IS the
      // persist, exactly like classic decap's `renderSimpleControls` wiring
      // `onPublish`/`onPublishAndNew`/`onPublishAndDuplicate` straight to
      // `onPersist`. Without this check every publish attempt in simple mode
      // dead-ends on the "not ready" alert below, because `currentStatus` is
      // always `undefined` there (DCMS-484).
      if (!hasWorkflow) {
        await handlePersistEntry({ createNew, duplicate });
        return;
      }

      if (!slug) return;

      if (currentStatus !== Object.values(status).pop()) {
        showAlert(t('editor.editor.onPublishingNotReady'));
        return;
      } else if (entryDraft?.hasChanged) {
        showAlert(t('editor.editor.onPublishingWithUnsavedChanges'));
        return;
      } else if (!window.confirm(t('editor.editor.onPublishing'))) {
        return;
      }

      await dispatch(publishUnpublishedEntry(collection.name, slug) as any);
      deleteBackup();

      if (createNew) {
        navigateToNewEntry(collection.name);
      }

      if (duplicate && entryDraft) {
        dispatch(createDraftDuplicateFromEntry(entryDraft.entry) as any);
      }
    },
    [collection, slug, hasWorkflow, currentStatus, entryDraft, t, dispatch, deleteBackup, handlePersistEntry],
  );

  const handleUnpublishEntry = useCallback(async () => {
    if (!collection || !slug) return;

    if (!window.confirm(t('editor.editor.onUnpublishing'))) return;

    await dispatch(unpublishPublishedEntry(collection, slug) as any);
    return navigateToCollection(collection.name);
  }, [collection, slug, t, dispatch]);

  const handleDuplicateEntry = useCallback(() => {
    if (!collection || !entryDraft) return;

    navigateToNewEntry(collection.name);

    dispatch(createDraftDuplicateFromEntry(entryDraft.entry) as any);
  }, [collection, entryDraft, dispatch]);

  const handleDeleteEntry = useCallback(() => {
    if (!collection) return;

    if (entryDraft?.hasChanged) {
      if (!window.confirm(t('editor.editor.onDeleteWithUnsavedChanges'))) {
        return;
      }
    } else if (!window.confirm(t('editor.editor.onDeletePublishedEntry'))) {
      return;
    }

    if (newEntry) {
      return navigateToCollection(collection.name);
    }

    setTimeout(async () => {
      if (slug) {
        await dispatch(deleteEntry(collection, slug) as any);
      }
      deleteBackup();
      return navigateToCollection(collection.name);
    }, 0);
  }, [collection, entryDraft, newEntry, slug, t, dispatch, deleteBackup]);

  const handleDeleteUnpublishedChanges = useCallback(async () => {
    if (!collection || !slug) return;

    if (
      entryDraft?.hasChanged
      && !window.confirm(t('editor.editor.onDeleteUnpublishedChangesWithUnsavedChanges'))
    ) {
      return;
    } else if (!window.confirm(t('editor.editor.onDeleteUnpublishedChanges'))) {
      return;
    }

    await dispatch(deleteUnpublishedEntry(collection.name, slug) as any);
    deleteBackup();

    if (isModification) {
      workflow.loadEntry(collection, slug);
    } else {
      navigateToCollection(collection.name);
    }
  }, [collection, slug, entryDraft, isModification, t, dispatch, deleteBackup, workflow]);

  const handleLogout = useCallback(() => {
    dispatch(logoutUser() as any);
  }, [dispatch]);

  const handleLoadDeployPreview = useCallback(
    (opts?: any) => {
      if (!collection || !entry || !slug) return;
      const isPublished = !newEntry && !workflow.unpublishedEntry;

      dispatch(
        loadDeployPreview(collection, slug, entry as unknown as Entry, isPublished, opts) as any,
      );
    },
    [collection, slug, entry, newEntry, workflow.unpublishedEntry, dispatch],
  );

  const handleValidate = useCallback(
    (field: any, errors: any) => {
      dispatch(changeDraftFieldValidation(field, errors) as any);
    },
    [dispatch],
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
