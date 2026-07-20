import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkflow } from '@/core/hooks/useWorkflow';

import type * as EditorialWorkflowActions from '@/core/actions/editorialWorkflow';
import type * as EntriesActions from '@/core/actions/entries';

// `loadUnpublishedEntry`/`persistUnpublishedEntry` and `loadEntry`/`persistEntry`
// are real thunks that hit the configured backend — out of scope here. We only
// want to assert *which one* `useWorkflow` picks based on `isEditorialWorkflow`,
// so they're stubbed to trackable plain actions.
vi.mock('@/core/actions/editorialWorkflow', async importOriginal => {
  const actual = await importOriginal<typeof EditorialWorkflowActions>();
  return {
    ...actual,
    loadUnpublishedEntry: vi.fn((collection: unknown, slug: string) => ({
      type: 'test/loadUnpublishedEntry',
      payload: { collection, slug },
    })),
    persistUnpublishedEntry: vi.fn((collection: unknown, hasUnpublishedEntry: boolean) => ({
      type: 'test/persistUnpublishedEntry',
      payload: { collection, hasUnpublishedEntry },
    })),
  };
});
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    loadEntry: vi.fn((collection: unknown, slug: string) => ({
      type: 'test/loadEntry',
      payload: { collection, slug },
    })),
    persistEntry: vi.fn((collection: unknown) => ({
      type: 'test/persistEntry',
      payload: { collection },
    })),
  };
});

// eslint-disable-next-line import/order
import { loadUnpublishedEntry, persistUnpublishedEntry } from '@/core/actions/editorialWorkflow';
// eslint-disable-next-line import/order
import { loadEntry, persistEntry } from '@/core/actions/entries';

const postsCollection = {
  name: 'posts',
  type: 'folder_based_collection',
  folder: '_posts',
  fields: [],
} as any;

type TestState = {
  collections: Record<string, unknown>,
  config: { publish_mode?: string },
  editorialWorkflow: { entities: Record<string, unknown> },
};

function buildStore(initial: TestState) {
  return createStore(
    combineReducers({
      collections: (state = initial.collections, action: any) =>
        action.type === 'TEST_SET_COLLECTIONS' ? action.payload : state,
      config: (state = initial.config, action: any) => (action.type === 'TEST_SET_CONFIG' ? action.payload : state),
      editorialWorkflow: (state = initial.editorialWorkflow, action: any) =>
        action.type === 'TEST_SET_EDITORIAL_WORKFLOW' ? action.payload : state,
    }),
    applyMiddleware(thunk),
  );
}

function setup(initial: TestState, options: { collectionName: string, slug?: string, newEntry: boolean }) {
  const store = buildStore(initial);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result, rerender } = renderHook(() => useWorkflow(options), { wrapper });
  return { store, result, rerender };
}

describe('useWorkflow', () => {
  beforeEach(() => {
    vi.mocked(loadUnpublishedEntry).mockClear();
    vi.mocked(persistUnpublishedEntry).mockClear();
    vi.mocked(loadEntry).mockClear();
    vi.mocked(persistEntry).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the documented shape in simple publish mode', () => {
    const { result } = setup(
      {
        collections: { posts: postsCollection },
        config: { publish_mode: 'simple' },
        editorialWorkflow: { entities: {} },
      },
      { collectionName: 'posts', newEntry: false },
    );

    expect(result.current.isEditorialWorkflow).toBe(false);
    expect(result.current.showDelete).toBe(true);
    expect(result.current.unpublishedEntry).toBe(false);
    expect(result.current.entry).toBeNull();
    expect(typeof result.current.loadEntry).toBe('function');
    expect(typeof result.current.persistEntry).toBe('function');
  });

  it('showDelete is false for a new entry even when the collection allows deletion', () => {
    const { result } = setup(
      {
        collections: { posts: postsCollection },
        config: { publish_mode: 'simple' },
        editorialWorkflow: { entities: {} },
      },
      { collectionName: 'posts', newEntry: true },
    );

    expect(result.current.showDelete).toBe(false);
  });

  it('showDelete is false when the collection has delete: false', () => {
    const { result } = setup(
      {
        collections: { posts: { ...postsCollection, delete: false } },
        config: { publish_mode: 'simple' },
        editorialWorkflow: { entities: {} },
      },
      { collectionName: 'posts', newEntry: false },
    );

    expect(result.current.showDelete).toBe(false);
  });

  it('reflects an unpublished entry appearing in the editorial workflow store (state-transition)', () => {
    const { store, result, rerender } = setup(
      {
        collections: { posts: postsCollection },
        config: { publish_mode: 'editorial_workflow' },
        editorialWorkflow: { entities: {} },
      },
      { collectionName: 'posts', slug: 'my-post', newEntry: false },
    );

    expect(result.current.isEditorialWorkflow).toBe(true);
    expect(result.current.unpublishedEntry).toBe(false);
    expect(result.current.entry).toBeFalsy();

    const unpublished = { collection: 'posts', slug: 'my-post', status: 'draft' };
    act(() => {
      store.dispatch({
        type: 'TEST_SET_EDITORIAL_WORKFLOW',
        payload: { entities: { 'posts.my-post': unpublished } },
      } as any);
    });
    rerender();

    expect(result.current.unpublishedEntry).toBe(true);
    expect(result.current.entry).toEqual(unpublished);
  });

  it('loadEntry() dispatches loadUnpublishedEntry() in editorial workflow mode', () => {
    const { result } = setup(
      {
        collections: { posts: postsCollection },
        config: { publish_mode: 'editorial_workflow' },
        editorialWorkflow: { entities: {} },
      },
      { collectionName: 'posts', slug: 'my-post', newEntry: false },
    );

    act(() => {
      result.current.loadEntry(postsCollection, 'my-post');
    });

    expect(loadUnpublishedEntry).toHaveBeenCalledTimes(1);
    expect(loadUnpublishedEntry).toHaveBeenCalledWith(postsCollection, 'my-post');
  });

  it('loadEntry() dispatches the plain loadEntry() thunk in simple publish mode', () => {
    const { result } = setup(
      {
        collections: { posts: postsCollection },
        config: { publish_mode: 'simple' },
        editorialWorkflow: { entities: {} },
      },
      { collectionName: 'posts', slug: 'my-post', newEntry: false },
    );

    act(() => {
      result.current.loadEntry(postsCollection, 'my-post');
    });

    expect(loadEntry).toHaveBeenCalledTimes(1);
    expect(loadEntry).toHaveBeenCalledWith(postsCollection, 'my-post');
  });

  it('persistEntry() dispatches persistUnpublishedEntry(collection, hasUnpublishedEntry) in editorial workflow mode', () => {
    const { result } = setup(
      {
        collections: { posts: postsCollection },
        config: { publish_mode: 'editorial_workflow' },
        editorialWorkflow: { entities: { 'posts.my-post': { collection: 'posts', slug: 'my-post' } } },
      },
      { collectionName: 'posts', slug: 'my-post', newEntry: false },
    );

    act(() => {
      result.current.persistEntry(postsCollection);
    });

    expect(persistUnpublishedEntry).toHaveBeenCalledTimes(1);
    expect(persistUnpublishedEntry).toHaveBeenCalledWith(postsCollection, true);
  });

  it('persistEntry() dispatches the plain persistEntry() thunk in simple publish mode', () => {
    const { result } = setup(
      {
        collections: { posts: postsCollection },
        config: { publish_mode: 'simple' },
        editorialWorkflow: { entities: {} },
      },
      { collectionName: 'posts', newEntry: false },
    );

    act(() => {
      result.current.persistEntry(postsCollection);
    });

    expect(persistEntry).toHaveBeenCalledTimes(1);
    expect(persistEntry).toHaveBeenCalledWith(postsCollection);
  });
});
