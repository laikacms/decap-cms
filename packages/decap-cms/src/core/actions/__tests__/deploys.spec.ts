import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEPLOY_PREVIEW_FAILURE, DEPLOY_PREVIEW_REQUEST, DEPLOY_PREVIEW_SUCCESS, loadDeployPreview } from '@/core/actions/deploys';
import { FILES } from '@/core/constants/collectionTypes';
import { previewUrlFormatter } from '@/core/lib/formatters';
import { createEntry } from '@/core/valueObjects/Entry';
import * as backendModule from '@/core/backend';
import * as selectorsModule from '@/core/reducers/selectors';

vi.mock('../../backend');
vi.mock('../../reducers/selectors');

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

const collection = { name: 'posts' } as any;
const entry = { slug: 'my-post' } as any;

describe('deploys actions', () => {
  const currentBackend = vi.mocked(backendModule.currentBackend);
  const selectDeployPreview = vi.mocked(selectorsModule.selectDeployPreview);

  beforeEach(() => {
    vi.clearAllMocks();
    selectDeployPreview.mockReturnValue(undefined);
  });

  describe('loadDeployPreview', () => {
    it('dispatches request then success on a normal successful preview fetch', async () => {
      const getDeployPreview = vi.fn().mockResolvedValue({ url: 'https://preview.example.com', status: 'SUCCESS' });
      currentBackend.mockReturnValue({ getDeployPreview } as any);
      const store = mockStore({ config: {} });

      await store.dispatch(loadDeployPreview(collection, 'my-post', entry, false) as any);

      expect(getDeployPreview).toHaveBeenCalledWith(collection, 'my-post', entry, undefined);
      expect(store.getActions()).toEqual([
        { type: DEPLOY_PREVIEW_REQUEST, payload: { collection: 'posts', slug: 'my-post' } },
        {
          type: DEPLOY_PREVIEW_SUCCESS,
          payload: { collection: 'posts', slug: 'my-post', url: 'https://preview.example.com', status: 'SUCCESS' },
        },
      ]);
    });

    it('skips the request when a fetch is already in flight and no signal is passed', async () => {
      selectDeployPreview.mockReturnValue({ isFetching: true } as any);
      const getDeployPreview = vi.fn();
      currentBackend.mockReturnValue({ getDeployPreview } as any);
      const store = mockStore({ config: {} });

      await store.dispatch(loadDeployPreview(collection, 'my-post', entry, false) as any);

      expect(getDeployPreview).not.toHaveBeenCalled();
      expect(store.getActions()).toEqual([]);
    });

    it('proceeds even when a fetch is already in flight if a signal is passed', async () => {
      selectDeployPreview.mockReturnValue({ isFetching: true } as any);
      const getDeployPreview = vi.fn().mockResolvedValue({ url: 'https://preview.example.com', status: 'SUCCESS' });
      currentBackend.mockReturnValue({ getDeployPreview } as any);
      const store = mockStore({ config: {} });
      const controller = new AbortController();

      await store.dispatch(loadDeployPreview(collection, 'my-post', entry, false, { signal: controller.signal }) as any);

      expect(getDeployPreview).toHaveBeenCalledWith(collection, 'my-post', entry, { signal: controller.signal });
      expect(store.getActions()).toEqual([
        { type: DEPLOY_PREVIEW_REQUEST, payload: { collection: 'posts', slug: 'my-post' } },
        {
          type: DEPLOY_PREVIEW_SUCCESS,
          payload: { collection: 'posts', slug: 'my-post', url: 'https://preview.example.com', status: 'SUCCESS' },
        },
      ]);
    });

    it('dispatches failure when the backend call rejects', async () => {
      const getDeployPreview = vi.fn().mockRejectedValue(new Error('network down'));
      currentBackend.mockReturnValue({ getDeployPreview } as any);
      const store = mockStore({ config: {} });

      await store.dispatch(loadDeployPreview(collection, 'my-post', entry, false) as any);

      const actions = store.getActions();
      expect(actions[0]).toEqual({ type: DEPLOY_PREVIEW_REQUEST, payload: { collection: 'posts', slug: 'my-post' } });
      expect(actions[actions.length - 1]).toEqual({
        type: DEPLOY_PREVIEW_FAILURE,
        payload: { collection: 'posts', slug: 'my-post' },
      });
    });

    it('uses getDeploy (not getDeployPreview) for published entries', async () => {
      const getDeploy = vi.fn().mockReturnValue({ url: 'https://live.example.com', status: 'SUCCESS' });
      const getDeployPreview = vi.fn();
      currentBackend.mockReturnValue({ getDeploy, getDeployPreview } as any);
      const store = mockStore({ config: {} });

      await store.dispatch(loadDeployPreview(collection, 'my-post', entry, true) as any);

      expect(getDeploy).toHaveBeenCalledWith(collection, 'my-post', entry);
      expect(getDeployPreview).not.toHaveBeenCalled();
      expect(store.getActions()).toEqual([
        { type: DEPLOY_PREVIEW_REQUEST, payload: { collection: 'posts', slug: 'my-post' } },
        {
          type: DEPLOY_PREVIEW_SUCCESS,
          payload: { collection: 'posts', slug: 'my-post', url: 'https://live.example.com', status: 'SUCCESS' },
        },
      ]);
    });

    it('builds a preview URL with files[].preview_path for a real files-collection entry', async () => {
      const filesCollection = {
        name: 'pages',
        type: FILES,
        preview_path: '/default',
        files: [
          { name: 'about', file: 'about.md', label: 'About', preview_path: '/about-us' },
          { name: 'home', file: 'home.md', label: 'Home' },
        ],
      } as any;
      const aboutEntry = createEntry('pages', 'about', 'about.md', { data: { title: 'About' } });
      const getDeploy = vi.fn((c, slug, e) => ({
        url: previewUrlFormatter('https://site.example.com', c, slug, e),
        status: 'SUCCESS',
      }));
      const getDeployPreview = vi.fn();
      currentBackend.mockReturnValue({ getDeploy, getDeployPreview } as any);
      const store = mockStore({ config: {} });

      await store.dispatch(loadDeployPreview(filesCollection, 'about', aboutEntry as any, true) as any);

      expect(getDeploy).toHaveBeenCalledWith(filesCollection, 'about', aboutEntry);
      expect(store.getActions()).toEqual([
        { type: DEPLOY_PREVIEW_REQUEST, payload: { collection: 'pages', slug: 'about' } },
        {
          type: DEPLOY_PREVIEW_SUCCESS,
          payload: { collection: 'pages', slug: 'about', url: 'https://site.example.com/about-us', status: 'SUCCESS' },
        },
      ]);
    });

    it('dispatches failure when the backend returns no deploy', async () => {
      const getDeployPreview = vi.fn().mockResolvedValue(undefined);
      currentBackend.mockReturnValue({ getDeployPreview } as any);
      const store = mockStore({ config: {} });

      await store.dispatch(loadDeployPreview(collection, 'my-post', entry, false) as any);

      expect(store.getActions()).toEqual([
        { type: DEPLOY_PREVIEW_REQUEST, payload: { collection: 'posts', slug: 'my-post' } },
        { type: DEPLOY_PREVIEW_FAILURE, payload: { collection: 'posts', slug: 'my-post' } },
      ]);
    });
  });
});
