import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { fromJS } from 'immutable';

import { addAssets } from '../media';
import * as actions from '../editorialWorkflow';

jest.mock('../../backend');
jest.mock('../../valueObjects/AssetProxy');
jest.mock('decap-cms-lib-util');
jest.mock('uuid', () => {
  return { v4: jest.fn().mockReturnValue('000000000000000000000') };
});

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('editorialWorkflow actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadUnpublishedEntry', () => {
    it('should load unpublished entry', () => {
      const { currentBackend } = require('../../backend');
      const { createAssetProxy } = require('../../valueObjects/AssetProxy');

      const assetProxy = { name: 'name', path: 'path' };
      const entry = { mediaFiles: [{ file: { name: 'name' }, id: '1', draft: true }] };
      const backend = {
        unpublishedEntry: jest.fn().mockResolvedValue(entry),
      };

      const store = mockStore({
        config: fromJS({}),
        collections: fromJS({
          posts: { name: 'posts' },
        }),
        mediaLibrary: fromJS({
          isLoading: false,
        }),
        editorialWorkflow: fromJS({
          pages: { ids: [] },
        }),
      });

      currentBackend.mockReturnValue(backend);
      createAssetProxy.mockResolvedValue(assetProxy);

      const slug = 'slug';
      const collection = store.getState().collections.get('posts');

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
      const { currentBackend } = require('../../backend');

      const entry = {};
      const backend = {
        publishUnpublishedEntry: jest.fn().mockResolvedValue(),
        getEntry: jest.fn().mockResolvedValue(entry),
        getMedia: jest.fn().mockResolvedValue([]),
      };

      const store = mockStore({
        config: fromJS({}),
        integrations: {},
        mediaLibrary: fromJS({
          isLoading: false,
        }),
        collections: fromJS({
          posts: { name: 'posts' },
        }),
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
      const { currentBackend } = require('../../backend');

      const error = new Error('failed to publish entry');
      const backend = {
        publishUnpublishedEntry: jest.fn().mockRejectedValue(error),
      };

      const store = mockStore({
        config: fromJS({}),
        collections: fromJS({
          posts: { name: 'posts' },
        }),
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

  describe('scheduleUnpublishedEntryPublish', () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('stores the schedule and reports success for a future date', () => {
      const store = mockStore({});
      const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      store.dispatch(actions.scheduleUnpublishedEntryPublish('posts', 'slug', futureDate));

      const dispatched = store.getActions();
      expect(dispatched).toHaveLength(2);
      expect(dispatched[0]).toEqual({
        type: 'UNPUBLISHED_ENTRY_PUBLISH_SCHEDULE_SUCCESS',
        payload: { collection: 'posts', slug: 'slug', publishAt: futureDate },
      });
      expect(dispatched[1]).toEqual({
        type: 'NOTIFICATION_SEND',
        payload: {
          message: { key: 'ui.toast.entryScheduled' },
          type: 'success',
          dismissAfter: 4000,
        },
      });
    });

    it('rejects a date in the past without persisting it', () => {
      const store = mockStore({});
      const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      store.dispatch(actions.scheduleUnpublishedEntryPublish('posts', 'slug', pastDate));

      const dispatched = store.getActions();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]).toEqual({
        type: 'NOTIFICATION_SEND',
        payload: {
          message: { key: 'ui.toast.invalidScheduleDate' },
          type: 'error',
          dismissAfter: 8000,
        },
      });
    });
  });

  describe('unscheduleUnpublishedEntryPublish', () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('clears the schedule and reports success', () => {
      const store = mockStore({});

      store.dispatch(actions.unscheduleUnpublishedEntryPublish('posts', 'slug'));

      const dispatched = store.getActions();
      expect(dispatched).toEqual([
        {
          type: 'UNPUBLISHED_ENTRY_PUBLISH_UNSCHEDULE_SUCCESS',
          payload: { collection: 'posts', slug: 'slug' },
        },
        {
          type: 'NOTIFICATION_SEND',
          payload: {
            message: { key: 'ui.toast.entryUnscheduled' },
            type: 'success',
            dismissAfter: 4000,
          },
        },
      ]);
    });
  });

  describe('checkScheduledPublishes', () => {
    it('publishes ready entries whose publishAt has passed', () => {
      const { currentBackend } = require('../../backend');
      const backend = {
        publishUnpublishedEntry: jest.fn().mockResolvedValue(),
        getEntry: jest.fn().mockResolvedValue({}),
        getMedia: jest.fn().mockResolvedValue([]),
      };
      currentBackend.mockReturnValue(backend);

      const store = mockStore({
        config: fromJS({}),
        integrations: {},
        mediaLibrary: fromJS({ isLoading: false }),
        collections: fromJS({ posts: { name: 'posts' } }),
        editorialWorkflow: fromJS({
          entities: {
            'posts.due-post': {
              collection: 'posts',
              slug: 'due-post',
              status: 'pending_publish',
              publishAt: new Date(Date.now() - 60 * 1000).toISOString(),
            },
            'posts.future-post': {
              collection: 'posts',
              slug: 'future-post',
              status: 'pending_publish',
              publishAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            },
            'posts.draft-post': {
              collection: 'posts',
              slug: 'draft-post',
              status: 'draft',
              publishAt: new Date(Date.now() - 60 * 1000).toISOString(),
            },
          },
        }),
      });

      store.dispatch(actions.checkScheduledPublishes());

      expect(backend.publishUnpublishedEntry).toHaveBeenCalledTimes(1);
      expect(backend.publishUnpublishedEntry).toHaveBeenCalledWith(
        expect.objectContaining({ get: expect.any(Function) }),
      );

      const dispatched = store.getActions();
      expect(dispatched[0]).toEqual({
        type: 'UNPUBLISHED_ENTRY_PUBLISH_REQUEST',
        payload: { collection: 'posts', slug: 'due-post' },
      });
    });

    it('does nothing when there are no editorial workflow entities', () => {
      const store = mockStore({ editorialWorkflow: fromJS({}) });
      store.dispatch(actions.checkScheduledPublishes());
      expect(store.getActions()).toHaveLength(0);
    });
  });
});
