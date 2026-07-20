import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { describe, expect, it, vi } from 'vitest';

import { createEmptyDraft, loadLocalBackup, retrieveLocalBackup } from '@/core/actions/entries';
import * as backendModule from '@/core/backend';
import { resolveFormat } from '@/core/formats/formats';
import { registerEntryCodec } from '@/core/lib/registry';
import entryDraft from '@/core/reducers/entryDraft';
import { createEntry } from '@/core/valueObjects/Entry';
import { createMarkdownEntryCodec } from '@/entry-codecs/markdown/index';
import { yamlEntryCodec, yamlFrontmatterCodec } from '@/entry-codecs/yaml/index';

vi.mock('../../backend');

// Real entry-codec registration (not mocked) so `resolveFormat`/`fromFile`
// below runs the actual frontmatter parser DCMS-1157's own analysis singled
// out as a suspect, rather than a stub.
registerEntryCodec(yamlEntryCodec);
registerEntryCodec(createMarkdownEntryCodec({ frontmatter: [yamlFrontmatterCodec] }));

// DCMS-1149's guard (`entries.tsx` ~L777) only bails `createEmptyDraft` when
// `state.entryDraft.hasChanged` is already `true`. But `hasChanged` only
// flips to `true` once the user clicks OK on the recovery dialog
// (`DRAFT_CREATE_FROM_LOCAL_BACKUP`); simply having *retrieved* a pending
// backup (`DRAFT_LOCAL_BACKUP_RETRIEVED`, which only populates
// `state.entryDraft.localBackup`) leaves `hasChanged` at `false`. On a fast
// backend (test-repo, or any warm-cache git backend), `retrieveLocalBackup`
// and `createEmptyDraft` both resolve before the user reads the dialog and
// clicks OK: `retrieveLocalBackup` wins the race and stashes the backup in
// `state.entryDraft.localBackup`, then `createEmptyDraft`'s guard sees
// `hasChanged === false`, passes, and dispatches `DRAFT_CREATE_EMPTY` —
// which replaces the *entire* `entryDraft` slice with a fresh
// `{ ...initialState, entry, key }`, silently dropping `localBackup` along
// with everything else. When the user's OK click finally reaches
// `loadLocalBackup()` -> `DRAFT_CREATE_FROM_LOCAL_BACKUP`, it reads
// `state.localBackup?.entry`, which is now `undefined`: the reducer sets
// `hasChanged: true` (so the header shows "unsaved changes") but `entry`
// has no `data` at all, so every widget renders empty (DCMS-1157).
describe('local-backup restore after createEmptyDraft has already superseded it (DCMS-1157)', () => {
  it('keeps the recovered backup data even when createEmptyDraft resolves before the user clicks OK', async () => {
    const raw = '---\ntitle: DCMS-1149 verify\ndraft: false\n---\nBody-1149-content';

    const collection = {
      name: 'posts',
      media_folder: 'assets/uploads',
      fields: [
        { name: 'title', widget: 'string' },
        { name: 'draft', widget: 'boolean' },
        { name: 'body', widget: 'richtext' },
      ],
    } as any;

    // Real format layer: parse `raw` exactly the way `Backend.getLocalDraftBackup`
    // does (`entryWithFormat` -> `resolveFormat` -> `format.fromFile`), instead
    // of stubbing `data` directly.
    const format = resolveFormat(collection, { path: '' } as any);
    const backupEntry = {
      ...createEntry('posts', '', '', { raw }),
      data: format.fromFile(raw),
    };
    expect(backupEntry.data).toEqual({ title: 'DCMS-1149 verify', draft: false, body: 'Body-1149-content' });

    // `processEntry` stays pending until explicitly resolved below, so the
    // test controls the exact race: `retrieveLocalBackup` (IndexedDB read)
    // settles and stashes the backup FIRST — matching the issue's own
    // description of a fast IndexedDB read racing a still-in-flight backend
    // call — and only then does `createEmptyDraft`'s guard get evaluated.
    let resolveProcessEntry!: (entry: unknown) => void;
    const processEntryPromise = new Promise(resolve => {
      resolveProcessEntry = resolve;
    });

    const backend = {
      getLocalDraftBackup: vi.fn().mockResolvedValue({ entry: backupEntry }),
      processEntry: vi.fn().mockImplementation(() => processEntryPromise),
    };
    vi.mocked(backendModule.currentBackend).mockReturnValue(backend as any);

    const store = createStore(
      combineReducers({ entryDraft, mediaLibrary: (state = { isLoading: false, files: [] }) => state }),
      applyMiddleware(thunk),
    );

    // Mirrors `useEditor`'s `setup()`: both dispatched on mount, neither awaited.
    const retrievePromise = store.dispatch(retrieveLocalBackup(collection, '') as any);
    const createEmptyPromise = store.dispatch(createEmptyDraft(collection, '') as any);

    // The IndexedDB-backed backup read settles first, stashing the backup —
    // still well before the user has read the dialog and clicked OK.
    await retrievePromise;
    expect((store.getState() as any).entryDraft.localBackup?.entry).toEqual(backupEntry);

    // `createEmptyDraft`'s outstanding `processEntry` call now finishes too
    // (e.g. a fast test-repo/warm-cache media listing) — still before the
    // user has clicked OK. Its guard only checks `hasChanged`, which is
    // still `false` at this point (retrieving a backup doesn't set it), so
    // it proceeds to dispatch `DRAFT_CREATE_EMPTY`.
    resolveProcessEntry({ data: {}, mediaFiles: [] });
    await createEmptyPromise;

    // User clicks OK.
    store.dispatch(loadLocalBackup() as any);

    const finalState = (store.getState() as any).entryDraft;
    expect(finalState.hasChanged).toBe(true);
    expect(finalState.entry.data).toEqual(backupEntry.data);
  });
});
