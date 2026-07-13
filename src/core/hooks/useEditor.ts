import { useCallback, useEffect, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';

import { useAppDispatch, useAppSelector } from './useRedux';
import { useWorkflow } from './useWorkflow';
import { useTranslate } from './useTranslate';
import { navigateToCollection, navigateToNewEntry } from '../routing/navigation';
import { defaultRouter, routerHistory as history } from '../routing/router';
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
import type { RouterUpdate, RouterTransition } from '../routing/router';
import type { CmsCollectionState, CmsEntry } from '../../lib/util/index';

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

  // Refs for cleanup functions
  const exitBlockerRef = useRef<((event: BeforeUnloadEvent) => string | undefined) | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const unblockRef = useRef<(() => void) | null>(null);
  const popSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const entry = useAppSelector(state =>
    newEntry ? null : selectEntry(state, collectionName, slug || ''),
  ) as Entry | null;

  const unPublishedEntry = useAppSelector(state =>
    selectUnpublishedEntry(state, collectionName, slug || ''),
  );

  const publishedEntry = useAppSelector(state =>
    selectEntry(state, collectionName, slug || ''),
  ) as Entry | null;

  const deployPreview = useAppSelector(state =>
    selectDeployPreview(state, collectionName, slug || ''),
  );

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

    // Setup navigation blocker (history v5 API)
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

    const unblock = defaultRouter.block(navigationBlocker);
    unblockRef.current = unblock;

    // Setup navigation listener (receives { location, action } on every navigation)
    const unlisten = defaultRouter.subscribe(({ location, action }: RouterUpdate) => {
      const newEntryPath = `/collections/${collection!.name}/new`;
      const entriesPath = `/collections/${collection!.name}/entries/`;
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

    // POP-navigation safety net (DCMS-286).
    //
    // `history@5`'s `history.block()` above can only intercept a browser
    // back/forward navigation when it can find the target location's `idx`
    // in the native history state, i.e. a location it created itself (see
    // history/hash.js `handlePop`). For any other POP — most notably the
    // very first Back the user presses, landing on whatever history entry
    // existed before this app took over — it just warns ("...block will
    // fail silently in production...") and lets the browser navigate away
    // without ever calling `navigationBlocker` above, so the unsaved-changes
    // guard is silently skipped for exactly the case it exists to cover.
    //
    // The native `hashchange` event always fires, unlike `history.block()`/
    // `history.listen` in this failure mode. Use it to detect when
    // `history`'s internal bookkeeping has fallen out of sync with the real
    // URL, then resync through the SAME shared `history` instance
    // (`history.replace`), which re-stamps `idx` so this location blocks
    // correctly on the next POP. Debounce so this doesn't race the
    // multi-tick revert/retry dance `history.block()` runs for the case it
    // CAN handle (idx known) — that dance always settles well within the
    // debounce window.
    const isInSync = () => window.location.href === history.createHref(history.location);
    const getHashPath = () => {
      const raw = window.location.hash;
      return raw.startsWith('#') ? raw.slice(1) || '/' : raw || '/';
    };

    // Set right before we programmatically revert the URL bar on cancel
    // (below), since that revert itself fires a native `hashchange` — without
    // this, that synthetic event would re-enter this handler and prompt a
    // second confirm for the same cancelled navigation.
    let suppressNextHashChange = false;

    // `history.replace()` still goes through the `block()` we installed above
    // (history@5 runs every registered blocker for REPLACE too, see
    // `allowTx` in history/hash.js), so calling it while `navigationBlocker`
    // is still armed re-invokes that blocker for this resync and — now that
    // it reads the live draft via `entryDraftRef` — prompts a second,
    // redundant confirm for the exact navigation this safety net (or the
    // user, just above) already resolved. Unblock only for the duration of
    // the resync call, then immediately restore the block so later external
    // hash mutations in this same edit session are still guarded.
    const resyncHistory = (path: string) => {
      unblockRef.current?.();
      history.replace(path);
      unblockRef.current = defaultRouter.block(navigationBlocker);
    };

    const handleHashChange = () => {
      if (suppressNextHashChange) {
        suppressNextHashChange = false;
        return;
      }
      if (popSyncTimerRef.current) {
        clearTimeout(popSyncTimerRef.current);
      }
      popSyncTimerRef.current = setTimeout(() => {
        popSyncTimerRef.current = null;

        const path = getHashPath();
        const draft = entryDraftRef.current;
        const newEntryPath = `/collections/${collection!.name}/new`;
        const isPersistingNewEntry =
          draft?.entry?.isPersisting && draft?.entry?.newRecord && path === newEntryPath;

        if (isPersistingNewEntry || !draft?.hasChanged) {
          // Nothing to protect. Only hand bookkeeping back to `history` (which
          // fires the `listen` callback registered above as normal) if it
          // hasn't already resynced on its own — calling `history.replace`
          // when already in sync would stamp a spurious extra entry.
          if (!isInSync()) {
            resyncHistory(path);
          }
          return;
        }

        // Deliberately do NOT gate on `isInSync()` here: a POP to a location
        // `history` didn't create (the exact case this safety net exists for,
        // e.g. the first browser Back after app boot) never calls `applyTx`,
        // so `history.location` can legitimately stay desynced from
        // `window.location` even after this debounce settles. Trusting
        // `isInSync()` as "already handled, safe to skip" previously let a
        // dirty draft's guard be silently bypassed on any such external hash
        // mutation (DCMS-456) — the dirty-draft check below is the real
        // guard, and it must always run.

        if (window.confirm(leaveMessage)) {
          resyncHistory(path);
        } else {
          // Revert the URL bar back to where the app actually is.
          suppressNextHashChange = true;
          window.location.href = history.createHref(history.location);
        }
      }, 50);
    };
    window.addEventListener('hashchange', handleHashChange);

    return {
      cleanup: () => {
        createBackup.flush();

        dispatch(discardDraft() as any);
        if (exitBlockerRef.current) {
          window.removeEventListener('beforeunload', exitBlockerRef.current);
        }
        window.removeEventListener('hashchange', handleHashChange);
        if (popSyncTimerRef.current) {
          clearTimeout(popSyncTimerRef.current);
          popSyncTimerRef.current = null;
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
        window.alert(t('editor.editor.onUpdatingWithUnsavedChanges'));
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
    async (opts: { createNew?: boolean; duplicate?: boolean } = {}) => {
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
    async (opts: { createNew?: boolean; duplicate?: boolean } = {}) => {
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
        window.alert(t('editor.editor.onPublishingNotReady'));
        return;
      } else if (entryDraft?.hasChanged) {
        window.alert(t('editor.editor.onPublishingWithUnsavedChanges'));
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
      entryDraft?.hasChanged &&
      !window.confirm(t('editor.editor.onDeleteUnpublishedChangesWithUnsavedChanges'))
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
