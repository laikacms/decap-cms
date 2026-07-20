import { describe, expect, it } from 'vitest';

import {
  clearSearch,
  querying,
  queryFailure,
  querySuccess,
  searchFailure,
  searchingEntries,
  searchSuccess,
} from '@/core/actions/search';
import search from '@/core/reducers/search';
import { createEntry } from '@/core/valueObjects/Entry';

import type { SearchAction } from '@/core/actions/search';
import type { Search } from '@/core/reducers/search';

const defaultState: Search = {
  isFetching: false,
  term: '',
  collections: [],
  page: 0,
  entryIds: [],
  queryHits: {},
  error: undefined,
};

describe('search', () => {
  it('should return the default state', () => {
    expect(search(undefined, {} as unknown as SearchAction)).toEqual(defaultState);
  });

  it('should set isFetching, term, collections and page on SEARCH_ENTRIES_REQUEST', () => {
    const state = search(undefined, searchingEntries('foo', ['posts', 'pages'], 1));

    expect(state.isFetching).toBe(true);
    expect(state.term).toBe('foo');
    expect(state.collections).toEqual(['posts', 'pages']);
    expect(state.page).toBe(1);
  });

  it('should reset to the default state on SEARCH_CLEAR', () => {
    const requestedState = search(undefined, searchingEntries('foo', ['posts'], 1));
    const state = search(requestedState, clearSearch());

    expect(state).toEqual(defaultState);
  });

  describe('SEARCH_ENTRIES_SUCCESS', () => {
    it('should set isFetching to false, update page and set entryIds when page is 0', () => {
      const requestedState = search(undefined, searchingEntries('foo', ['posts'], 0));
      const entries = [createEntry('posts', 'a'), createEntry('posts', 'b')];
      const state = search(requestedState, searchSuccess(entries, 0));

      expect(state.isFetching).toBe(false);
      expect(state.page).toBe(0);
      expect(state.entryIds).toEqual([
        { collection: 'posts', slug: 'a' },
        { collection: 'posts', slug: 'b' },
      ]);
    });

    it('should append entryIds to the existing list when page is greater than 0', () => {
      const firstPageState = search(undefined, searchSuccess([createEntry('posts', 'a')], 0));
      const state = search(firstPageState, searchSuccess([createEntry('posts', 'b')], 1));

      expect(state.page).toBe(1);
      expect(state.entryIds).toEqual([
        { collection: 'posts', slug: 'a' },
        { collection: 'posts', slug: 'b' },
      ]);
    });

    it('should replace entryIds instead of appending when page is undefined or NaN', () => {
      const firstPageState = search(undefined, searchSuccess([createEntry('posts', 'a')], 0));
      const state = search(
        firstPageState,
        searchSuccess([createEntry('posts', 'b')], NaN),
      );

      expect(state.entryIds).toEqual([{ collection: 'posts', slug: 'b' }]);
    });
  });

  it('should set isFetching to false and set error on SEARCH_ENTRIES_FAILURE', () => {
    const requestedState = search(undefined, searchingEntries('foo', ['posts'], 0));
    const error = new Error('search failed');
    const state = search(requestedState, searchFailure(error));

    expect(state.isFetching).toBe(false);
    expect(state.error).toBe(error);
  });

  it('should set isFetching and term on QUERY_REQUEST', () => {
    const state = search(undefined, querying('bar'));

    expect(state.isFetching).toBe(true);
    expect(state.term).toBe('bar');
  });

  it('should set isFetching to false and store hits under the namespace on QUERY_SUCCESS', () => {
    const requestedState = search(undefined, querying('bar'));
    const hits = [createEntry('posts', 'a')];
    const state = search(requestedState, querySuccess('field', hits));

    expect(state.isFetching).toBe(false);
    expect(state.queryHits).toEqual({ field: hits });
  });

  it('should merge queryHits across namespaces without dropping previous entries', () => {
    const firstState = search(undefined, querySuccess('title', [createEntry('posts', 'a')]));
    const state = search(firstState, querySuccess('body', [createEntry('posts', 'b')]));

    expect(state.queryHits).toEqual({
      title: [createEntry('posts', 'a')],
      body: [createEntry('posts', 'b')],
    });
  });

  it('should set isFetching to false and set error on QUERY_FAILURE', () => {
    const requestedState = search(undefined, querying('bar'));
    const error = new Error('query failed');
    const state = search(requestedState, queryFailure(error));

    expect(state.isFetching).toBe(false);
    expect(state.error).toBe(error);
  });

  it('should return the same state for an unrecognized action', () => {
    const state = search(undefined, { type: 'UNKNOWN_ACTION' } as unknown as SearchAction);
    expect(state).toEqual(defaultState);
  });
});
