import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadEntry } from '@/core/actions/entries';
import * as backendModule from '@/core/backend';
import { isCompleteEntry } from '@/core/reducers/entries';
import { createEntry, createProjectedEntry } from '@/core/valueObjects/Entry';
import queryCore from '@/lib/util/queryCore';

vi.mock('../../backend');
vi.mock('../mediaLibrary');

const mockStore = configureMockStore([thunk]);

/**
 * A search result overwrites the cached entry with whatever the index stores,
 * so "in the store and fresh" is not the same as "loaded in full". Opening a
 * projection for editing would save it back over the real entry, dropping
 * every field the index does not keep (DCMS-1907).
 */

const collection = { name: 'posts', fields: [{ name: 'title' }] };

const loaded = createEntry('posts', 'hello', 'content/posts/hello.md', {
  data: { title: 'Hello', body: 'The whole post' },
});

function storeWith(entry: unknown) {
  return mockStore({
    config: {},
    mediaLibrary: { files: [], isLoading: false },
    entries: { entities: { 'posts.hello': entry }, pages: {} },
  });
}

beforeEach(() => {
  vi.mocked(backendModule.currentBackend).mockReturnValue({
    getEntry: vi.fn(() => Promise.resolve(loaded)),
    processEntry: vi.fn((_state, _collection, entry) => Promise.resolve(entry)),
  } as never);
  queryCore.clear();
});

afterEach(() => {
  queryCore.clear();
});

describe('loadEntry with a cached entry', () => {
  it('opens a complete cached entry without refetching', async () => {
    const store = storeWith({ ...loaded, isFetching: false });
    // Mark the entry query fresh, as a completed load would.
    await queryCore.fetch('entry/posts/hello', () => Promise.resolve(loaded));
    const backend = backendModule.currentBackend({} as never);

    await store.dispatch(loadEntry(collection as never, 'hello') as never);

    expect(backend.getEntry).not.toHaveBeenCalled();
    expect(store.getActions().map(action => action.type)).toEqual(['DRAFT_CREATE_FROM_ENTRY']);
  });

  it('refetches instead of opening a cached projection', async () => {
    const projection = createProjectedEntry('posts', 'hello', 'content/posts/hello.md', {
      // What the search index stores: the title, and nothing else.
      data: { title: 'Hello' },
    });
    const store = storeWith({ ...projection, isFetching: false });
    // Fresh by query key: the entry was loaded, then a search overwrote it.
    await queryCore.fetch('entry/posts/hello', () => Promise.resolve(loaded));
    const backend = backendModule.currentBackend({} as never);

    await store.dispatch(loadEntry(collection as never, 'hello') as never);

    expect(backend.getEntry).toHaveBeenCalledWith(expect.anything(), collection, 'hello');
    const drafted = store.getActions().find(action => action.type === 'DRAFT_CREATE_FROM_ENTRY');
    expect(drafted?.payload.entry.data).toEqual({ title: 'Hello', body: 'The whole post' });
  });
});

describe('isCompleteEntry', () => {
  it('accepts an entry that was loaded in full', () => {
    expect(isCompleteEntry(createEntry('posts', 'hello') as never)).toBe(true);
  });

  it('rejects a projection', () => {
    expect(isCompleteEntry(createProjectedEntry('posts', 'hello') as never)).toBe(false);
  });

  it('accepts entries predating the flag', () => {
    // Local draft backups and any other stored entry written before the flag
    // existed have no `projected` key; those were always full entries.
    expect(isCompleteEntry({ collection: 'posts', slug: 'hello' } as never)).toBe(true);
  });
});
