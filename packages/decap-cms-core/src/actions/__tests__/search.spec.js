import { fromJS } from 'immutable';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import { searchEntries, query } from '../search';

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

jest.mock('../../reducers');
jest.mock('../../backend');
jest.mock('../../integrations');

describe('search', () => {
  describe('searchEntries', () => {
    const { currentBackend } = require('../../backend');
    const { selectIntegration } = require('../../reducers');
    const { getIntegrationProvider } = require('../../integrations');

    beforeEach(() => {
      jest.resetAllMocks();
    });
    it('should search entries in all collections using integration', async () => {
      const store = mockStore({
        collections: fromJS({ posts: { name: 'posts' }, pages: { name: 'pages' } }),
        search: {},
      });

      selectIntegration.mockReturnValue('search_integration');
      currentBackend.mockReturnValue({});
      const response = { entries: [{ name: '1' }, { name: '' }], pagination: 1 };
      const integration = { search: jest.fn().mockResolvedValue(response) };
      getIntegrationProvider.mockReturnValue(integration);

      await store.dispatch(searchEntries('find me'));
      const actions = store.getActions();
      expect(actions).toHaveLength(2);

      expect(actions[0]).toEqual({
        type: 'SEARCH_ENTRIES_REQUEST',
        payload: {
          searchTerm: 'find me',
          searchCollections: ['posts', 'pages'],
          page: 0,
        },
      });
      expect(actions[1]).toEqual({
        type: 'SEARCH_ENTRIES_SUCCESS',
        payload: {
          entries: response.entries,
          page: response.pagination,
        },
      });

      expect(integration.search).toHaveBeenCalledTimes(1);
      expect(integration.search).toHaveBeenCalledWith(['posts', 'pages'], 'find me', 0);
    });

    it('should search entries in a subset of collections using integration', async () => {
      const store = mockStore({
        collections: fromJS({ posts: { name: 'posts' }, pages: { name: 'pages' } }),
        search: {},
      });

      selectIntegration.mockReturnValue('search_integration');
      currentBackend.mockReturnValue({});
      const response = { entries: [{ name: '1' }, { name: '' }], pagination: 1 };
      const integration = { search: jest.fn().mockResolvedValue(response) };
      getIntegrationProvider.mockReturnValue(integration);

      await store.dispatch(searchEntries('find me', ['pages']));
      const actions = store.getActions();
      expect(actions).toHaveLength(2);

      expect(actions[0]).toEqual({
        type: 'SEARCH_ENTRIES_REQUEST',
        payload: {
          searchTerm: 'find me',
          searchCollections: ['pages'],
          page: 0,
        },
      });
      expect(actions[1]).toEqual({
        type: 'SEARCH_ENTRIES_SUCCESS',
        payload: {
          entries: response.entries,
          page: response.pagination,
        },
      });

      expect(integration.search).toHaveBeenCalledTimes(1);
      expect(integration.search).toHaveBeenCalledWith(['pages'], 'find me', 0);
    });

    it('should search entries in all collections using backend', async () => {
      const store = mockStore({
        collections: fromJS({ posts: { name: 'posts' }, pages: { name: 'pages' } }),
        search: {},
      });

      const response = { entries: [{ name: '1' }, { name: '' }], pagination: 1 };
      const backend = { search: jest.fn().mockResolvedValue(response) };
      currentBackend.mockReturnValue(backend);

      await store.dispatch(searchEntries('find me'));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);

      expect(actions[0]).toEqual({
        type: 'SEARCH_ENTRIES_REQUEST',
        payload: {
          searchTerm: 'find me',
          searchCollections: ['posts', 'pages'],
          page: 0,
        },
      });
      expect(actions[1]).toEqual({
        type: 'SEARCH_ENTRIES_SUCCESS',
        payload: {
          entries: response.entries,
          page: response.pagination,
        },
      });

      expect(backend.search).toHaveBeenCalledTimes(1);
      expect(backend.search).toHaveBeenCalledWith(
        [fromJS({ name: 'posts' }), fromJS({ name: 'pages' })],
        'find me',
      );
    });

    it('should search entries in a subset of collections using backend', async () => {
      const store = mockStore({
        collections: fromJS({ posts: { name: 'posts' }, pages: { name: 'pages' } }),
        search: {},
      });

      const response = { entries: [{ name: '1' }, { name: '' }], pagination: 1 };
      const backend = { search: jest.fn().mockResolvedValue(response) };
      currentBackend.mockReturnValue(backend);

      await store.dispatch(searchEntries('find me', ['pages']));

      const actions = store.getActions();
      expect(actions).toHaveLength(2);

      expect(actions[0]).toEqual({
        type: 'SEARCH_ENTRIES_REQUEST',
        payload: {
          searchTerm: 'find me',
          searchCollections: ['pages'],
          page: 0,
        },
      });
      expect(actions[1]).toEqual({
        type: 'SEARCH_ENTRIES_SUCCESS',
        payload: {
          entries: response.entries,
          page: response.pagination,
        },
      });

      expect(backend.search).toHaveBeenCalledTimes(1);
      expect(backend.search).toHaveBeenCalledWith([fromJS({ name: 'pages' })], 'find me');
    });

    it('should ignore identical search in all collections', async () => {
      const store = mockStore({
        collections: fromJS({ posts: { name: 'posts' }, pages: { name: 'pages' } }),
        search: { isFetching: true, term: 'find me', collections: ['posts', 'pages'] },
      });

      await store.dispatch(searchEntries('find me'));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should ignore identical search in a subset of collections', async () => {
      const store = mockStore({
        collections: fromJS({ posts: { name: 'posts' }, pages: { name: 'pages' } }),
        search: { isFetching: true, term: 'find me', collections: ['pages'] },
      });

      await store.dispatch(searchEntries('find me', ['pages']));

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should not ignore same search term in different search collections', async () => {
      const store = mockStore({
        collections: fromJS({ posts: { name: 'posts' }, pages: { name: 'pages' } }),
        search: { isFetching: true, term: 'find me', collections: ['pages'] },
      });
      const backend = { search: jest.fn().mockResolvedValue({}) };
      currentBackend.mockReturnValue(backend);

      await store.dispatch(searchEntries('find me', ['posts', 'pages']));

      expect(backend.search).toHaveBeenCalledTimes(1);
      expect(backend.search).toHaveBeenCalledWith(
        [fromJS({ name: 'posts' }), fromJS({ name: 'pages' })],
        'find me',
      );
    });
  });

  describe('query', () => {
    const { currentBackend } = require('../../backend');
    const { selectIntegration } = require('../../reducers');

    beforeEach(() => {
      jest.resetAllMocks();
    });

    /**
     * Regression test for DCMS-019.
     *
     * The thunk must call getState() AFTER dispatching clearRequests() so that
     * expired entries are already removed from state.requests before the
     * deduplication look-up happens.  If the stale pre-dispatch snapshot were
     * used instead, the expired entry would still appear in requests.find()
     * and the thunk would skip the backend call — returning the expired promise.
     */
    it('does not reuse an expired request — reads post-clearRequests state', async () => {
      const queryIdentifier = 'posts-title-hello-undefined-undefined';

      // Simulate an expired request that should be cleared
      const expiredRequest = {
        id: queryIdentifier,
        expires: new Date(Date.now() - 1000), // already expired
        queryResponse: Promise.resolve({ hits: [], query: 'stale' }),
      };

      const baseCollections = fromJS({ posts: { name: 'posts' } });

      // getState is called twice by the thunk:
      //   1st call  — before dispatch(clearRequests())  → stale state with expired request
      //   2nd call  — after  dispatch(clearRequests())  → fresh state with requests cleared
      const staleState = {
        config: {},
        collections: baseCollections,
        integrations: {},
        search: { requests: [expiredRequest] },
      };
      const freshState = {
        config: {},
        collections: baseCollections,
        integrations: {},
        search: { requests: [] }, // expired entry removed by clearRequests
      };

      let callCount = 0;
      const getState = jest.fn(() => {
        callCount += 1;
        return callCount === 1 ? staleState : freshState;
      });

      const dispatched = [];
      const dispatch = jest.fn(action => {
        if (typeof action === 'function') {
          return action(dispatch, getState);
        }
        dispatched.push(action);
      });

      const backendQueryResult = { hits: [{ slug: 'hello' }], query: 'hello' };
      const backend = { query: jest.fn().mockResolvedValue(backendQueryResult) };
      currentBackend.mockReturnValue(backend);
      selectIntegration.mockReturnValue(null); // no integration

      await query('ns', 'posts', ['title'], 'hello')(dispatch, getState);

      // Backend must have been called — the expired request must NOT have been reused
      expect(backend.query).toHaveBeenCalledTimes(1);

      // A new QUERY_REQUEST with a fresh request object must have been dispatched
      const queryRequestAction = dispatched.find(a => a.type === 'QUERY_REQUEST');
      expect(queryRequestAction).toBeDefined();
      expect(queryRequestAction.payload.request).toBeDefined();
      expect(queryRequestAction.payload.request.id).toBe(queryIdentifier);

      // QUERY_SUCCESS should carry the fresh backend hits
      const querySuccessAction = dispatched.find(a => a.type === 'QUERY_SUCCESS');
      expect(querySuccessAction).toBeDefined();
      expect(querySuccessAction.payload.hits).toEqual(backendQueryResult.hits);
    });

    it('reuses a valid (non-expired) cached request and skips backend call', async () => {
      const queryIdentifier = 'posts-title-hello-undefined-undefined';
      const cachedPromise = Promise.resolve({ hits: [{ slug: 'cached' }], query: 'hello' });

      const validRequest = {
        id: queryIdentifier,
        expires: new Date(Date.now() + 60_000), // still valid
        queryResponse: cachedPromise,
      };

      const state = {
        config: {},
        collections: fromJS({ posts: { name: 'posts' } }),
        integrations: {},
        search: { requests: [validRequest] },
      };

      const getState = jest.fn(() => state);

      const dispatched = [];
      const dispatch = jest.fn(action => {
        if (typeof action === 'function') {
          return action(dispatch, getState);
        }
        dispatched.push(action);
      });

      const backend = { query: jest.fn() };
      currentBackend.mockReturnValue(backend);
      selectIntegration.mockReturnValue(null);

      await query('ns', 'posts', ['title'], 'hello')(dispatch, getState);

      // Backend must NOT be called — cached promise should be reused
      expect(backend.query).not.toHaveBeenCalled();

      // QUERY_REQUEST should be dispatched without a new request object (dedup path)
      const queryRequestAction = dispatched.find(a => a.type === 'QUERY_REQUEST');
      expect(queryRequestAction).toBeDefined();
      expect(queryRequestAction.payload.request).toBeUndefined();

      const querySuccessAction = dispatched.find(a => a.type === 'QUERY_SUCCESS');
      expect(querySuccessAction).toBeDefined();
      expect(querySuccessAction.payload.hits).toEqual([{ slug: 'cached' }]);
    });
  });
});
