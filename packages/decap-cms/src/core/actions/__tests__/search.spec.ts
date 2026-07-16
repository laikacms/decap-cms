import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { searchEntries } from '@/core/actions/search';

import type { Middleware } from 'redux';

const middlewares: Middleware[] = [thunk as unknown as Middleware];
const mockStore = configureMockStore(middlewares);

vi.mock('../../reducers/selectors');
vi.mock('../../backend');
vi.mock('../../integrations');

describe('search', () => {
  describe('searchEntries', () => {
    let currentBackend: ReturnType<typeof vi.fn>;
    let selectIntegration: ReturnType<typeof vi.fn>;
    let getIntegrationProvider: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      vi.resetAllMocks();
      const backend = await import('@/core/backend');
      const reducers = await import('@/core/reducers/selectors');
      const integrations = await import('@/core/integrations');
      currentBackend = backend.currentBackend as ReturnType<typeof vi.fn>;
      selectIntegration = reducers.selectIntegration as ReturnType<typeof vi.fn>;
      getIntegrationProvider = integrations.getIntegrationProvider as ReturnType<typeof vi.fn>;
    });

    it('should search entries in all collections using integration', async () => {
      const store = mockStore({
        collections: { posts: { name: 'posts' }, pages: { name: 'pages' } },
        search: {},
      });

      selectIntegration.mockReturnValue('search_integration');
      currentBackend.mockReturnValue({});
      const response = { entries: [{ name: '1' }, { name: '' }], pagination: 1 };
      const integration = { search: vi.fn().mockResolvedValue(response) };
      getIntegrationProvider.mockReturnValue(integration);

      await store.dispatch(searchEntries('find me', undefined) as any);
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
        collections: { posts: { name: 'posts' }, pages: { name: 'pages' } },
        search: {},
      });

      selectIntegration.mockReturnValue('search_integration');
      currentBackend.mockReturnValue({});
      const response = { entries: [{ name: '1' }, { name: '' }], pagination: 1 };
      const integration = { search: vi.fn().mockResolvedValue(response) };
      getIntegrationProvider.mockReturnValue(integration);

      await store.dispatch(searchEntries('find me', ['pages']) as any);
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
        collections: { posts: { name: 'posts' }, pages: { name: 'pages' } },
        search: {},
      });

      const response = { entries: [{ name: '1' }, { name: '' }], pagination: 1 };
      const backend = { search: vi.fn().mockResolvedValue(response) };
      currentBackend.mockReturnValue(backend);

      await store.dispatch(searchEntries('find me', undefined) as any);

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
        [{ name: 'posts' }, { name: 'pages' }],
        'find me',
      );
    });

    it('should search entries in a subset of collections using backend', async () => {
      const store = mockStore({
        collections: { posts: { name: 'posts' }, pages: { name: 'pages' } },
        search: {},
      });

      const response = { entries: [{ name: '1' }, { name: '' }], pagination: 1 };
      const backend = { search: vi.fn().mockResolvedValue(response) };
      currentBackend.mockReturnValue(backend);

      await store.dispatch(searchEntries('find me', ['pages']) as any);

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
      expect(backend.search).toHaveBeenCalledWith([{ name: 'pages' }], 'find me');
    });

    it('should ignore identical search in all collections', async () => {
      const store = mockStore({
        collections: { posts: { name: 'posts' }, pages: { name: 'pages' } },
        search: { isFetching: true, term: 'find me', collections: ['posts', 'pages'] },
      });

      await store.dispatch(searchEntries('find me', undefined) as any);

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should ignore identical search in a subset of collections', async () => {
      const store = mockStore({
        collections: { posts: { name: 'posts' }, pages: { name: 'pages' } },
        search: { isFetching: true, term: 'find me', collections: ['pages'] },
      });

      await store.dispatch(searchEntries('find me', ['pages']) as any);

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should not ignore same search term in different search collections', async () => {
      const store = mockStore({
        collections: { posts: { name: 'posts' }, pages: { name: 'pages' } },
        search: { isFetching: true, term: 'find me', collections: ['pages'] },
      });
      const backend = { search: vi.fn().mockResolvedValue({}) };
      currentBackend.mockReturnValue(backend);

      await store.dispatch(searchEntries('find me', ['posts', 'pages']) as any);

      expect(backend.search).toHaveBeenCalledTimes(1);
      expect(backend.search).toHaveBeenCalledWith(
        [{ name: 'posts' }, { name: 'pages' }],
        'find me',
      );
    });
  });
});
