import { beforeEach, describe, expect, it, vi } from 'vitest';
import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';

import { addAssets } from '../media';
import * as actions from '../editorialWorkflow';
import * as backendModule from '../../backend';
import * as assetProxyModule from '../../valueObjects/AssetProxy';

vi.mock('../../backend');
vi.mock('../../valueObjects/AssetProxy');
vi.mock('decap-cms-lib-util');
vi.mock('uuid', () => {
  return { v4: vi.fn().mockReturnValue('000000000000000000000') };
});

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('editorialWorkflow actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadUnpublishedEntry', () => {
    it('should load unpublished entry', () => {
      const currentBackend = vi.mocked(backendModule.currentBackend);
      const createAssetProxy = vi.mocked(assetProxyModule.createAssetProxy);

      const assetProxy = { name: 'name', path: 'path' };
      const entry = { mediaFiles: [{ file: { name: 'name' }, id: '1', draft: true }] };
      const backend = {
        unpublishedEntry: vi.fn().mockResolvedValue(entry),
      };

      const store = mockStore({
        config: {},
        collections: {
          posts: { name: 'posts' },
        },
        mediaLibrary: {
          isLoading: false,
        },
        editorialWorkflow: {
          pages: { ids: [] },
        },
      });

      currentBackend.mockReturnValue(backend);
      createAssetProxy.mockResolvedValue(assetProxy);

      const slug = 'slug';
      const collection = store.getState().collections.posts;

      return store.dispatch(actions.loadUnpublishedEntry(collection, slug)).then(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(4);
        expect(actions[0]).toEqual({
          type: 'UNPUBLISHED_ENTRY_REQUEST',
          payload: {
            collection: 'posts',
            slug,
          },
        });
        expect(actions[1]).toEqual(addAssets([assetProxy]));
        expect(actions[2]).toEqual({
          type: 'UNPUBLISHED_ENTRY_SUCCESS',
          payload: {
            collection: 'posts',
            entry: { ...entry, mediaFiles: [{ file: { name: 'name' }, id: '1', draft: true }] },
          },
        });
        expect(actions[3]).toEqual({
          type: 'DRAFT_CREATE_FROM_ENTRY',
          payload: {
            entry,
          },
        });
      });
    });
  });

  describe('publishUnpublishedEntry', () => {
    it('should publish unpublished entry and report success', () => {
      const currentBackend = vi.mocked(backendModule.currentBackend);

      const entry = {};
      const backend = {
        publishUnpublishedEntry: vi.fn().mockResolvedValue(undefined),
        getEntry: vi.fn().mockResolvedValue(entry),
        getMedia: vi.fn().mockResolvedValue([]),
      };

      const store = mockStore({
        config: {},
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: {
          isLoading: false,
        },
        collections: {
          posts: { name: 'posts' },
        },
      });

      currentBackend.mockReturnValue(backend);

      const slug = 'slug';

      return store.dispatch(actions.publishUnpublishedEntry('posts', slug)).then(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(8);

        expect(actions[0]).toEqual({
          type: 'UNPUBLISHED_ENTRY_PUBLISH_REQUEST',
          payload: {
            collection: 'posts',
            slug,
          },
        });
        expect(actions[1]).toEqual({
          type: 'MEDIA_LOAD_REQUEST',
          payload: {
            page: 1,
          },
        });
        expect(actions[2]).toEqual({
          type: 'NOTIFICATION_SEND',
          payload: {
            message: { key: 'ui.toast.entryPublished' },
            type: 'success',
            dismissAfter: 4000,
          },
        });
        expect(actions[3]).toEqual({
          type: 'UNPUBLISHED_ENTRY_PUBLISH_SUCCESS',
          payload: {
            collection: 'posts',
            slug,
          },
        });

        expect(actions[4]).toEqual({
          type: 'MEDIA_LOAD_SUCCESS',
          payload: {
            files: [],
          },
        });
        expect(actions[5]).toEqual({
          type: 'ENTRY_REQUEST',
          payload: {
            slug,
            collection: 'posts',
          },
        });
        expect(actions[6]).toEqual({
          type: 'ENTRY_SUCCESS',
          payload: {
            entry,
            collection: 'posts',
          },
        });
        expect(actions[7]).toEqual({
          type: 'DRAFT_CREATE_FROM_ENTRY',
          payload: {
            entry,
          },
        });
      });
    });

    it('should publish unpublished entry and report error', () => {
      const currentBackend = vi.mocked(backendModule.currentBackend);

      const error = new Error('failed to publish entry');
      const backend = {
        publishUnpublishedEntry: vi.fn().mockRejectedValue(error),
      };

      const store = mockStore({
        config: {},
        collections: {
          posts: { name: 'posts' },
        },
      });

      currentBackend.mockReturnValue(backend);

      const slug = 'slug';

      return store.dispatch(actions.publishUnpublishedEntry('posts', slug)).then(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(3);
        expect(actions[0]).toEqual({
          type: 'UNPUBLISHED_ENTRY_PUBLISH_REQUEST',
          payload: {
            collection: 'posts',
            slug,
          },
        });
        expect(actions[1]).toEqual({
          type: 'NOTIFICATION_SEND',
          payload: {
            message: { key: 'ui.toast.onFailToPublishEntry', details: error },
            type: 'error',
            dismissAfter: 8000,
          },
        });
        expect(actions[2]).toEqual({
          type: 'UNPUBLISHED_ENTRY_PUBLISH_FAILURE',
          payload: {
            collection: 'posts',
            slug,
          },
        });
      });
    });
  });
});
