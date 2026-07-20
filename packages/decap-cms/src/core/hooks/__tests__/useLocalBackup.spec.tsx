import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocalBackup } from '@/core/hooks/useLocalBackup';

import type * as EntriesActions from '@/core/actions/entries';

// `useLocalBackup` only dispatches these four action creators from
// `@/core/actions/entries`. `persistLocalBackup`/`retrieveLocalBackup` are
// real thunks that talk to the configured backend — out of scope for this
// hook's own debounce/dispatch wiring — so they're stubbed to trackable
// plain actions. `loadLocalBackup`/`deleteLocalBackup` are already plain
// action creators upstream; stubbing them too keeps every assertion here
// about *what the hook calls*, not backend behavior.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    persistLocalBackup: vi.fn((entry: unknown, collection: unknown) => ({
      type: 'test/persistLocalBackup',
      payload: { entry, collection },
    })),
    retrieveLocalBackup: vi.fn((collection: unknown, slug: string) => ({
      type: 'test/retrieveLocalBackup',
      payload: { collection, slug },
    })),
    loadLocalBackup: vi.fn(() => ({ type: 'test/loadLocalBackup' })),
    deleteLocalBackup: vi.fn((collection: unknown, slug: string) => ({
      type: 'test/deleteLocalBackup',
      payload: { collection, slug },
    })),
  };
});

// eslint-disable-next-line import/order
import { deleteLocalBackup, loadLocalBackup, persistLocalBackup, retrieveLocalBackup } from '@/core/actions/entries';

const collection = { name: 'posts' } as any;

function buildStore() {
  // The hook doesn't read any state — only dispatches — so an identity
  // reducer plus thunk middleware is enough to drive it.
  return createStore((state = {}) => state, applyMiddleware(thunk));
}

function setup(overrides?: { debounceMs?: number, slug?: string }) {
  const store = buildStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(
    () => useLocalBackup({ collection, slug: overrides?.slug ?? 'my-post', debounceMs: overrides?.debounceMs }),
    { wrapper },
  );
  return { store, result };
}

describe('useLocalBackup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(persistLocalBackup).mockClear();
    vi.mocked(retrieveLocalBackup).mockClear();
    vi.mocked(loadLocalBackup).mockClear();
    vi.mocked(deleteLocalBackup).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the documented shape', () => {
    const { result } = setup();
    expect(typeof result.current.retrieve).toBe('function');
    expect(typeof result.current.load).toBe('function');
    expect(typeof result.current.persist).toBe('function');
    expect(typeof result.current.remove).toBe('function');
    expect(typeof result.current.flush).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
  });

  it('retrieve() dispatches retrieveLocalBackup(collection, slug) immediately', () => {
    const { result } = setup({ slug: 'my-post' });
    act(() => {
      result.current.retrieve();
    });
    expect(retrieveLocalBackup).toHaveBeenCalledTimes(1);
    expect(retrieveLocalBackup).toHaveBeenCalledWith(collection, 'my-post');
  });

  it('retrieve() falls back to an empty slug when none is given', () => {
    const store = buildStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useLocalBackup({ collection }), { wrapper });
    act(() => {
      result.current.retrieve();
    });
    expect(retrieveLocalBackup).toHaveBeenCalledWith(collection, '');
  });

  it('load() dispatches loadLocalBackup() immediately', () => {
    const { result } = setup();
    act(() => {
      result.current.load();
    });
    expect(loadLocalBackup).toHaveBeenCalledTimes(1);
  });

  it('persist() debounces the backup write: no dispatch before debounceMs elapses, one dispatch after', () => {
    const entry = { slug: 'my-post', data: { title: 'v1' } } as any;
    const { result } = setup({ debounceMs: 2000 });

    act(() => {
      result.current.persist(entry);
    });
    expect(persistLocalBackup).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(persistLocalBackup).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(persistLocalBackup).toHaveBeenCalledTimes(1);
    expect(persistLocalBackup).toHaveBeenCalledWith(entry, collection);
  });

  it('rapid persist() calls within the debounce window collapse into a single write of the latest entry', () => {
    const first = { slug: 'my-post', data: { title: 'v1' } } as any;
    const second = { slug: 'my-post', data: { title: 'v2' } } as any;
    const { result } = setup({ debounceMs: 2000 });

    act(() => {
      result.current.persist(first);
      vi.advanceTimersByTime(500);
      result.current.persist(second);
      vi.advanceTimersByTime(2000);
    });

    expect(persistLocalBackup).toHaveBeenCalledTimes(1);
    expect(persistLocalBackup).toHaveBeenCalledWith(second, collection);
  });

  it('flush() forces a pending persist() to dispatch immediately', () => {
    const entry = { slug: 'my-post', data: { title: 'v1' } } as any;
    const { result } = setup({ debounceMs: 2000 });

    act(() => {
      result.current.persist(entry);
      result.current.flush();
    });

    expect(persistLocalBackup).toHaveBeenCalledTimes(1);
    expect(persistLocalBackup).toHaveBeenCalledWith(entry, collection);
  });

  it('cancel() drops a pending persist() so it never dispatches', () => {
    const entry = { slug: 'my-post', data: { title: 'v1' } } as any;
    const { result } = setup({ debounceMs: 2000 });

    act(() => {
      result.current.persist(entry);
      result.current.cancel();
      vi.advanceTimersByTime(5000);
    });

    expect(persistLocalBackup).not.toHaveBeenCalled();
  });

  it('remove() cancels any pending persist() and dispatches deleteLocalBackup(collection, slug)', () => {
    const entry = { slug: 'my-post', data: { title: 'v1' } } as any;
    const { result } = setup({ slug: 'my-post', debounceMs: 2000 });

    act(() => {
      result.current.persist(entry);
      result.current.remove();
      vi.advanceTimersByTime(5000);
    });

    // The pending debounced write was cancelled, not flushed.
    expect(persistLocalBackup).not.toHaveBeenCalled();
    expect(deleteLocalBackup).toHaveBeenCalledTimes(1);
    expect(deleteLocalBackup).toHaveBeenCalledWith(collection, 'my-post');
  });
});
