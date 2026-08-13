import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCollection } from '@/core/hooks/useCollection';

import type * as EntriesActions from '@/core/actions/entries';

// `sortByField`/`filterByField`/`groupByField` are real thunks that read the
// entries store and hit the configured backend provider to refetch entries —
// out of scope here. We only want to assert that `useCollection`'s callbacks
// dispatch the *right* action creator with the *right* arguments, so they're
// stubbed to trackable plain actions. `changeViewStyle` is already a plain
// action creator, so it's left untouched.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    sortByField: vi.fn((collection: unknown, key: string, direction: unknown) => ({
      type: 'test/sortByField',
      payload: { collection, key, direction },
    })),
    filterByField: vi.fn((collection: unknown, filter: unknown) => ({
      type: 'test/filterByField',
      payload: { collection, filter },
    })),
    groupByField: vi.fn((collection: unknown, group: unknown) => ({
      type: 'test/groupByField',
      payload: { collection, group },
    })),
  };
});

// eslint-disable-next-line import/order
import { changeViewStyle, filterByField, groupByField, sortByField } from '@/core/actions/entries';

const postsCollection = {
  name: 'posts',
  type: 'folder_based_collection',
  folder: '_posts',
  fields: [],
  create: true,
} as any;

const pagesCollection = {
  name: 'pages',
  type: 'folder_based_collection',
  folder: '_pages',
  fields: [],
} as any;

type TestState = {
  collections: Record<string, unknown>,
  entries: {
    sort?: Record<string, unknown>,
    filter?: Record<string, unknown>,
    group?: Record<string, unknown>,
    viewStyle?: string,
  },
  config?: { search?: boolean },
};

function buildStore(initial: TestState) {
  return createStore(
    combineReducers({
      collections: (state = initial.collections, action: any) =>
        action.type === 'TEST_SET_COLLECTIONS' ? action.payload : state,
      entries: (state = initial.entries, action: any) =>
        action.type === 'CHANGE_VIEW_STYLE' ? { ...state, viewStyle: action.payload.style } : state,
      config: (state = initial.config ?? {}) => state,
    }),
    applyMiddleware(thunk),
  );
}

function setup(initial: TestState, collectionName?: string, t?: (key: string) => string) {
  const store = buildStore(initial);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result, rerender } = renderHook(() => useCollection(collectionName, t), { wrapper });
  return { store, result, rerender };
}

describe('useCollection', () => {
  beforeEach(() => {
    vi.mocked(sortByField).mockClear();
    vi.mocked(filterByField).mockClear();
    vi.mocked(groupByField).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('selects the first collection by insertion order when no collectionName is given', () => {
    const { result } = setup({
      collections: { posts: postsCollection, pages: pagesCollection },
      entries: {},
    });

    expect(result.current.collection).toBe(postsCollection);
    expect(result.current.collectionName).toBe('posts');
  });

  it('returns undefined when there are no collections at all', () => {
    const { result } = setup({ collections: {}, entries: {} });

    expect(result.current.collection).toBeUndefined();
    expect(result.current.collectionName).toBeUndefined();
  });

  it('looks up a named collection', () => {
    const { result } = setup(
      { collections: { posts: postsCollection, pages: pagesCollection }, entries: {} },
      'pages',
    );

    expect(result.current.collection).toBe(pagesCollection);
    expect(result.current.collectionName).toBe('pages');
  });

  it('returns undefined when the named collection does not exist', () => {
    const { result } = setup(
      { collections: { posts: postsCollection }, entries: {} },
      'missing',
    );

    expect(result.current.collection).toBeUndefined();
    expect(result.current.collectionName).toBeUndefined();
  });

  it('exposes collections and isSearchEnabled (defaults true when config.search is unset)', () => {
    const { result } = setup({
      collections: { posts: postsCollection },
      entries: {},
    });

    expect(result.current.collections).toEqual({ posts: postsCollection });
    expect(result.current.isSearchEnabled).toBe(true);
  });

  it('isSearchEnabled is false when config.search is explicitly false', () => {
    const { result } = setup({
      collections: { posts: postsCollection },
      entries: {},
      config: { search: false },
    });

    expect(result.current.isSearchEnabled).toBe(false);
  });

  it('derives sort/filter/group for the selected collection from the entries store', () => {
    const sort = { title: { key: 'title', direction: 'Ascending' } };
    const filter = { 'author:me': { id: 'author:me', active: true } };
    const group = { year: { id: 'year', active: true } };

    const { result } = setup(
      {
        collections: { posts: postsCollection },
        entries: {
          sort: { posts: sort },
          filter: { posts: filter },
          group: { posts: group },
          viewStyle: 'table',
        },
      },
      'posts',
    );

    expect(result.current.sort).toBe(sort);
    expect(result.current.filter).toBe(filter);
    expect(result.current.group).toBe(group);
    expect(result.current.viewStyle).toBe('table');
  });

  it('sort/filter/group are undefined when there is no selected collection', () => {
    const { result } = setup({ collections: {}, entries: {} });

    expect(result.current.sort).toBeUndefined();
    expect(result.current.filter).toBeUndefined();
    expect(result.current.group).toBeUndefined();
  });

  it('derives sortableFields via selectSortableFields when a translation function is provided', () => {
    const collection = {
      ...postsCollection,
      sortable_fields: [{ field: 'title' }],
      fields: [{ name: 'title', label: 'Title' }],
    };
    const t = (key: string) => key;

    const { result } = setup(
      { collections: { posts: collection }, entries: {} },
      'posts',
      t,
    );

    expect(result.current.sortableFields).toEqual([{ name: 'title', label: 'Title', key: 'title' }]);
  });

  it('sortableFields is empty when no translation function is provided', () => {
    const collection = { ...postsCollection, sortable_fields: [{ field: 'title' }] };

    const { result } = setup({ collections: { posts: collection }, entries: {} }, 'posts');

    expect(result.current.sortableFields).toEqual([]);
  });

  it('derives viewFilters/viewGroups from the collection config via the reducers selectors', () => {
    const viewFilters = [{ id: 'author:me', label: 'By me', field: 'author', pattern: 'me' }];
    const viewGroups = [{ id: 'year', label: 'By year', field: 'year' }];
    const collection = { ...postsCollection, view_filters: viewFilters, view_groups: viewGroups };

    const { result } = setup({ collections: { posts: collection }, entries: {} }, 'posts');

    expect(result.current.viewFilters).toEqual(viewFilters);
    expect(result.current.viewGroups).toEqual(viewGroups);
  });

  it('newEntryUrl is set when the collection allows creation', () => {
    const { result } = setup({ collections: { posts: postsCollection }, entries: {} }, 'posts');

    expect(result.current.newEntryUrl).toBe('/collections/posts/new');
  });

  it('newEntryUrl is empty when the collection does not allow creation', () => {
    const { result } = setup({ collections: { pages: pagesCollection }, entries: {} }, 'pages');

    expect(result.current.newEntryUrl).toBe('');
  });

  it('newEntryUrl is empty when there is no selected collection', () => {
    const { result } = setup({ collections: {}, entries: {} });

    expect(result.current.newEntryUrl).toBe('');
  });

  it('onSortClick dispatches sortByField(collection, key, direction)', () => {
    const { result } = setup({ collections: { posts: postsCollection }, entries: {} }, 'posts');

    act(() => {
      result.current.onSortClick('title', 'Ascending' as any);
    });

    expect(sortByField).toHaveBeenCalledTimes(1);
    expect(sortByField).toHaveBeenCalledWith(postsCollection, 'title', 'Ascending');
  });

  it('onSortClick is a no-op when there is no selected collection', () => {
    const { result } = setup({ collections: {}, entries: {} });

    act(() => {
      result.current.onSortClick('title', 'Ascending' as any);
    });

    expect(sortByField).not.toHaveBeenCalled();
  });

  it('onFilterClick dispatches filterByField(collection, filter)', () => {
    const { result } = setup({ collections: { posts: postsCollection }, entries: {} }, 'posts');
    const filterValue = { id: 'author:me', field: 'author', pattern: 'me' } as any;

    act(() => {
      result.current.onFilterClick(filterValue);
    });

    expect(filterByField).toHaveBeenCalledTimes(1);
    expect(filterByField).toHaveBeenCalledWith(postsCollection, filterValue);
  });

  it('onFilterClick is a no-op when there is no selected collection', () => {
    const { result } = setup({ collections: {}, entries: {} });

    act(() => {
      result.current.onFilterClick({ id: 'x' } as any);
    });

    expect(filterByField).not.toHaveBeenCalled();
  });

  it('onGroupClick dispatches groupByField(collection, group)', () => {
    const { result } = setup({ collections: { posts: postsCollection }, entries: {} }, 'posts');
    const groupValue = { id: 'year', field: 'year' } as any;

    act(() => {
      result.current.onGroupClick(groupValue);
    });

    expect(groupByField).toHaveBeenCalledTimes(1);
    expect(groupByField).toHaveBeenCalledWith(postsCollection, groupValue);
  });

  it('onGroupClick is a no-op when there is no selected collection', () => {
    const { result } = setup({ collections: {}, entries: {} });

    act(() => {
      result.current.onGroupClick({ id: 'x' } as any);
    });

    expect(groupByField).not.toHaveBeenCalled();
  });

  it('onChangeViewStyle dispatches changeViewStyle(style) regardless of the selected collection', () => {
    const { store, result, rerender } = setup({ collections: {}, entries: {} });

    act(() => {
      result.current.onChangeViewStyle('table');
    });
    rerender();

    expect(store.getState().entries.viewStyle).toBe('table');
    expect(result.current.viewStyle).toBe('table');
    expect(changeViewStyle('table')).toEqual({
      type: 'CHANGE_VIEW_STYLE',
      payload: { style: 'table' },
    });
  });
});
