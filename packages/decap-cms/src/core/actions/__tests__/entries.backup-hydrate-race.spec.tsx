import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { describe, expect, it, vi } from 'vitest';

import { createEmptyDraft, loadLocalBackup, retrieveLocalBackup } from '@/core/actions/entries';
import * as backendModule from '@/core/backend';
import entryDraft from '@/core/reducers/entryDraft';

vi.mock('../../backend');

// `createEmptyDraft` is asynchronous — it awaits `waitForMediaLibraryToLoad`
// and `backend.processEntry` (a real media-folder listing call against the
// backend implementation for collections with a `media_folder`) before
// dispatching `DRAFT_CREATE_EMPTY`. On a fresh `/new` reload, `useEditor`'s
// `setup()` (and, redundantly, its `handleEntryChange` effect) dispatch
// `createEmptyDraft` on mount at the same time `retrieveLocalBackup` starts
// reading the local backup out of IndexedDB. IndexedDB is typically much
// faster than a network-backed media-folder listing, so the backup-recovery
// dialog can appear and the user can click OK — dispatching
// `DRAFT_CREATE_FROM_LOCAL_BACKUP` — *before* the outstanding
// `createEmptyDraft` call finishes. When it finally does finish, it
// unconditionally dispatched `DRAFT_CREATE_EMPTY`, silently discarding the
// just-restored draft back to empty (DCMS-1149).
describe('createEmptyDraft vs. local-backup restore race (DCMS-1149)', () => {
  it('does not clobber a draft already hydrated from a local backup by a still-in-flight createEmptyDraft call', async () => {
    const backupEntry = {
      collection: 'posts',
      slug: '',
      path: '',
      raw: '',
      data: { title: 'BACKUP-REPRO-TITLE-x99' },
      mediaFiles: [],
      i18n: {},
    };

    // `processEntry` (called from inside `createEmptyDraft`) stays pending
    // until the test explicitly resolves it below, simulating a slow
    // media-folder listing that outlives the user's OK click.
    let resolveProcessEntry!: (entry: unknown) => void;
    const processEntryPromise = new Promise(resolve => {
      resolveProcessEntry = resolve;
    });

    const backend = {
      getLocalDraftBackup: vi.fn().mockResolvedValue({ entry: backupEntry }),
      processEntry: vi.fn().mockImplementation((_state: unknown, _collection: unknown, entry: unknown) => {
        void entry;
        return processEntryPromise;
      }),
    };
    vi.mocked(backendModule.currentBackend).mockReturnValue(backend as any);

    const store = createStore(
      combineReducers({ entryDraft, mediaLibrary: (state = { isLoading: false, files: [] }) => state }),
      applyMiddleware(thunk),
    );

    const collection = {
      name: 'posts',
      fields: [{ name: 'title', widget: 'string' }],
    } as any;

    // Mirrors `useEditor`'s `setup()`: both dispatches fire on mount, neither
    // awaited by the caller.
    const retrievePromise = store.dispatch(retrieveLocalBackup(collection, '') as any);
    const createEmptyPromise = store.dispatch(createEmptyDraft(collection, '') as any);

    // The backup read resolves quickly (no slow backend call in its path);
    // the user then clicks OK on the recovery dialog.
    await retrievePromise;
    expect((store.getState() as any).entryDraft.localBackup?.entry).toEqual(backupEntry);

    store.dispatch(loadLocalBackup() as any);
    expect((store.getState() as any).entryDraft.entry.data).toEqual(backupEntry.data);
    expect((store.getState() as any).entryDraft.hasChanged).toBe(true);

    // The slow `createEmptyDraft` call finally settles after the user has
    // already restored their backup.
    resolveProcessEntry({ data: {}, mediaFiles: [] });
    await createEmptyPromise;

    const finalState = (store.getState() as any).entryDraft;
    expect(finalState.entry.data).toEqual(backupEntry.data);
    expect(finalState.hasChanged).toBe(true);
  });
});
