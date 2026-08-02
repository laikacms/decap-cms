import search from '../search';
import {
  searchingEntries,
  searchSuccess,
  searchFailure,
  querying,
  querySuccess,
  queryFailure,
  clearSearch,
  clearRequests,
} from '../../actions/search';

import type { Search } from '../search';
import type { SearchAction } from '../../actions/search';
import type { EntryValue } from '../../valueObjects/Entry';

const defaultState: Search = {
  isFetching: false,
  term: '',
  collections: [],
  page: 0,
  entryIds: [],
  queryHits: {},
  error: undefined,
  requests: [],
};

function makeEntry(collection: string, slug: string) {
  return { collection, slug } as EntryValue;
}

describe('search reducer', () => {
  it('should return the default state for unknown actions', () => {
    const result = search(undefined, { type: 'UNKNOWN' } as unknown as SearchAction);
    expect(result).toEqual(defaultState);
  });

  describe('SEARCH_CLEAR', () => {
    it('resets state to default', () => {
      const dirtyState: Search = {
        isFetching: true,
        term: 'cats',
        collections: ['posts'],
        page: 3,
        entryIds: [{ collection: 'posts', slug: 'a' }],
        queryHits: { ns: [] },
        error: new Error('oops'),
        requests: [],
      };
      const result = search(dirtyState, clearSearch());
      expect(result).toEqual(defaultState);
    });
  });

  describe('SEARCH_ENTRIES_REQUEST', () => {
    it('sets isFetching, term, collections, and page', () => {
      const result = search(undefined, searchingEntries('dogs', ['posts', 'pages'], 2));
      expect(result.isFetching).toBe(true);
      expect(result.term).toBe('dogs');
      expect(result.collections).toEqual(['posts', 'pages']);
      expect(result.page).toBe(2);
    });
  });

  describe('SEARCH_ENTRIES_SUCCESS', () => {
    it('replaces entryIds when page is 0', () => {
      const stateWithEntries: Search = {
        ...defaultState,
        entryIds: [{ collection: 'posts', slug: 'old' }],
      };
      const entries = [makeEntry('posts', 'new1'), makeEntry('posts', 'new2')];
      const result = search(stateWithEntries, searchSuccess(entries, 0));
      expect(result.isFetching).toBe(false);
      expect(result.page).toBe(0);
      expect(result.entryIds).toEqual([
        { collection: 'posts', slug: 'new1' },
        { collection: 'posts', slug: 'new2' },
      ]);
    });

    it('appends entryIds when page > 0', () => {
      const stateWithEntries: Search = {
        ...defaultState,
        entryIds: [{ collection: 'posts', slug: 'existing' }],
      };
      const entries = [makeEntry('posts', 'appended')];
      const result = search(stateWithEntries, searchSuccess(entries, 1));
      expect(result.isFetching).toBe(false);
      expect(result.page).toBe(1);
      expect(result.entryIds).toEqual([
        { collection: 'posts', slug: 'existing' },
        { collection: 'posts', slug: 'appended' },
      ]);
    });
  });

  describe('SEARCH_ENTRIES_FAILURE', () => {
    it('sets error and clears isFetching', () => {
      const fetchingState: Search = { ...defaultState, isFetching: true };
      const error = new Error('search failed');
      const result = search(fetchingState, searchFailure(error));
      expect(result.isFetching).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('QUERY_REQUEST', () => {
    it('sets isFetching and term', () => {
      const result = search(undefined, querying('my query'));
      expect(result.isFetching).toBe(true);
      expect(result.term).toBe('my query');
    });

    it('pushes a request object when provided', () => {
      const req = {
        id: 'req-1',
        expires: new Date(Date.now() + 10000),
        queryResponse: Promise.resolve({ hits: [], query: 'my query' }),
      };
      const result = search(undefined, querying('my query', req));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].id).toBe('req-1');
    });

    it('does not push a request when none is provided', () => {
      const result = search(undefined, querying('my query', undefined));
      expect(result.requests).toHaveLength(0);
    });
  });

  describe('QUERY_SUCCESS', () => {
    it('sets queryHits for the given namespace and clears isFetching', () => {
      const fetchingState: Search = { ...defaultState, isFetching: true };
      const hits = [makeEntry('posts', 'hit1')];
      const result = search(fetchingState, querySuccess('myNamespace', hits));
      expect(result.isFetching).toBe(false);
      expect(result.queryHits['myNamespace']).toEqual(hits);
    });

    it('isolates hits per namespace', () => {
      const stateWithHits: Search = {
        ...defaultState,
        queryHits: { nsA: [makeEntry('posts', 'a')] },
      };
      const hits = [makeEntry('pages', 'b')];
      const result = search(stateWithHits, querySuccess('nsB', hits));
      expect(result.queryHits['nsA']).toEqual([{ collection: 'posts', slug: 'a' }]);
      expect(result.queryHits['nsB']).toEqual(hits);
    });
  });

  describe('QUERY_FAILURE', () => {
    it('sets error and clears isFetching', () => {
      const fetchingState: Search = { ...defaultState, isFetching: true };
      const error = new Error('query failed');
      const result = search(fetchingState, queryFailure(error));
      expect(result.isFetching).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('CLEAR_REQUESTS', () => {
    it('removes expired requests', () => {
      const past = new Date(Date.now() - 5000);
      const future = new Date(Date.now() + 5000);
      const stateWithRequests: Search = {
        ...defaultState,
        requests: [
          { id: 'expired', expires: past, queryResponse: Promise.resolve({ hits: [], query: '' }) },
          { id: 'valid', expires: future, queryResponse: Promise.resolve({ hits: [], query: '' }) },
        ],
      };
      const result = search(stateWithRequests, clearRequests());
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].id).toBe('valid');
    });

    it('keeps all requests when none are expired', () => {
      const future = new Date(Date.now() + 5000);
      const stateWithRequests: Search = {
        ...defaultState,
        requests: [
          { id: 'req-a', expires: future, queryResponse: Promise.resolve({ hits: [], query: '' }) },
          { id: 'req-b', expires: future, queryResponse: Promise.resolve({ hits: [], query: '' }) },
        ],
      };
      const result = search(stateWithRequests, clearRequests());
      expect(result.requests).toHaveLength(2);
    });

    it('removes all requests when all are expired', () => {
      const past = new Date(Date.now() - 5000);
      const stateWithRequests: Search = {
        ...defaultState,
        requests: [
          { id: 'old-1', expires: past, queryResponse: Promise.resolve({ hits: [], query: '' }) },
          { id: 'old-2', expires: past, queryResponse: Promise.resolve({ hits: [], query: '' }) },
        ],
      };
      const result = search(stateWithRequests, clearRequests());
      expect(result.requests).toHaveLength(0);
    });
  });
});
