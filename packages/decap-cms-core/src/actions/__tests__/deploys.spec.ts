import { fromJS } from 'immutable';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import { currentBackend } from '../../backend';
import {
  deployPreviewLoading,
  deployPreviewLoaded,
  deployPreviewError,
  loadDeployPreview,
  DEPLOY_PREVIEW_REQUEST,
  DEPLOY_PREVIEW_SUCCESS,
  DEPLOY_PREVIEW_FAILURE,
} from '../deploys';

jest.mock('../../backend');

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('loadDeployPreview', () => {
  it('does not call the backend when entry is not loaded (DCMS-479)', async () => {
    const backend = {
      getDeploy: jest.fn(),
      getDeployPreview: jest.fn(),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const store = mockStore({ config: fromJS({}) });
    const collection = { name: 'posts' };

    await store.dispatch(loadDeployPreview(collection, 'missing-slug', undefined, false));

    expect(backend.getDeploy).not.toHaveBeenCalled();
    expect(backend.getDeployPreview).not.toHaveBeenCalled();
    expect(store.getActions()).toEqual([]);
  });

  it('does not call the backend when collection is not loaded (DCMS-504)', async () => {
    const backend = {
      getDeploy: jest.fn(),
      getDeployPreview: jest.fn(),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const store = mockStore({ config: fromJS({}) });
    const entry = fromJS({ slug: 'my-first-post' });

    await store.dispatch(
      // Mirrors the EditorToolbar mount race (DCMS-504): the collection has
      // not resolved yet, so `collection` is undefined.
      loadDeployPreview(undefined, 'my-first-post', entry, false),
    );

    expect(backend.getDeploy).not.toHaveBeenCalled();
    expect(backend.getDeployPreview).not.toHaveBeenCalled();
    expect(store.getActions()).toEqual([]);
  });

  it('short-circuits when a deploy preview fetch is already in flight for the same collection/slug', async () => {
    const backend = {
      getDeploy: jest.fn(),
      getDeployPreview: jest.fn(),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const collection = { name: 'posts' };
    const entry = fromJS({ slug: 'my-first-post' });
    const store = mockStore({
      config: fromJS({}),
      deploys: { 'posts.my-first-post': { isFetching: true } },
    });

    await store.dispatch(loadDeployPreview(collection, 'my-first-post', entry, false));

    expect(backend.getDeploy).not.toHaveBeenCalled();
    expect(backend.getDeployPreview).not.toHaveBeenCalled();
    expect(store.getActions()).toEqual([]);
  });

  it('still calls the backend when in flight but the caller passes an abort signal', async () => {
    const backend = {
      getDeploy: jest.fn(),
      getDeployPreview: jest
        .fn()
        .mockResolvedValue({ url: 'https://preview.example.com', status: 'ready' }),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const collection = { name: 'posts' };
    const entry = fromJS({ slug: 'my-first-post' });
    const store = mockStore({
      config: fromJS({}),
      deploys: { 'posts.my-first-post': { isFetching: true } },
    });
    const controller = new AbortController();

    await store.dispatch(
      loadDeployPreview(collection, 'my-first-post', entry, false, { signal: controller.signal }),
    );

    expect(backend.getDeployPreview).toHaveBeenCalledWith(collection, 'my-first-post', entry, {
      signal: controller.signal,
    });
  });

  it('uses backend.getDeploy for published entries', async () => {
    const deploy = { url: 'https://prod.example.com', status: 'ready' };
    const backend = {
      getDeploy: jest.fn().mockReturnValue(deploy),
      getDeployPreview: jest.fn(),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const collection = { name: 'posts' };
    const entry = fromJS({ slug: 'my-first-post' });
    const store = mockStore({ config: fromJS({}), deploys: {} });

    await store.dispatch(loadDeployPreview(collection, 'my-first-post', entry, true));

    expect(backend.getDeploy).toHaveBeenCalledWith(collection, 'my-first-post', entry);
    expect(backend.getDeployPreview).not.toHaveBeenCalled();
    expect(store.getActions()).toEqual([
      deployPreviewLoading('posts', 'my-first-post'),
      deployPreviewLoaded('posts', 'my-first-post', deploy),
    ]);
  });

  it('uses backend.getDeployPreview for unpublished entries', async () => {
    const deploy = { url: 'https://preview.example.com', status: 'ready' };
    const backend = {
      getDeploy: jest.fn(),
      getDeployPreview: jest.fn().mockResolvedValue(deploy),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const collection = { name: 'posts' };
    const entry = fromJS({ slug: 'my-first-post' });
    const store = mockStore({ config: fromJS({}), deploys: {} });

    await store.dispatch(loadDeployPreview(collection, 'my-first-post', entry, false));

    expect(backend.getDeployPreview).toHaveBeenCalledWith(
      collection,
      'my-first-post',
      entry,
      undefined,
    );
    expect(backend.getDeploy).not.toHaveBeenCalled();
    expect(store.getActions()).toEqual([
      deployPreviewLoading('posts', 'my-first-post'),
      deployPreviewLoaded('posts', 'my-first-post', deploy),
    ]);
  });

  it('dispatches deployPreviewError when the backend resolves with no deploy', async () => {
    const backend = {
      getDeploy: jest.fn(),
      getDeployPreview: jest.fn().mockResolvedValue(undefined),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const collection = { name: 'posts' };
    const entry = fromJS({ slug: 'my-first-post' });
    const store = mockStore({ config: fromJS({}), deploys: {} });

    await store.dispatch(loadDeployPreview(collection, 'my-first-post', entry, false));

    expect(store.getActions()).toEqual([
      deployPreviewLoading('posts', 'my-first-post'),
      deployPreviewError('posts', 'my-first-post'),
    ]);
  });

  it('dispatches an error notification and deployPreviewError when the backend call throws', async () => {
    const error = new Error('network unreachable');
    const backend = {
      getDeploy: jest.fn(),
      getDeployPreview: jest.fn().mockRejectedValue(error),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const collection = { name: 'posts' };
    const entry = fromJS({ slug: 'my-first-post' });
    const store = mockStore({ config: fromJS({}), deploys: {} });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await store.dispatch(loadDeployPreview(collection, 'my-first-post', entry, false));

    const actions = store.getActions();
    expect(actions[0]).toEqual(deployPreviewLoading('posts', 'my-first-post'));
    expect(actions[1]).toMatchObject({
      type: 'NOTIFICATION_SEND',
      payload: expect.objectContaining({
        type: 'error',
        message: expect.objectContaining({
          key: 'ui.toast.onFailToLoadDeployPreview',
          details: 'network unreachable',
        }),
      }),
    });
    expect(actions[2]).toEqual(deployPreviewError('posts', 'my-first-post'));

    consoleErrorSpy.mockRestore();
  });
});

describe('deploy preview action creators', () => {
  it('deployPreviewLoading() returns DEPLOY_PREVIEW_REQUEST with collection and slug', () => {
    const action = deployPreviewLoading('posts', 'my-first-post');
    expect(action).toEqual({
      type: DEPLOY_PREVIEW_REQUEST,
      payload: { collection: 'posts', slug: 'my-first-post' },
    });
  });

  it('deployPreviewLoaded() returns DEPLOY_PREVIEW_SUCCESS with collection, slug, url and status', () => {
    const deploy = { url: 'https://preview.example.com', status: 'ready' };
    const action = deployPreviewLoaded('posts', 'my-first-post', deploy);
    expect(action).toEqual({
      type: DEPLOY_PREVIEW_SUCCESS,
      payload: {
        collection: 'posts',
        slug: 'my-first-post',
        url: deploy.url,
        status: deploy.status,
      },
    });
  });

  it('deployPreviewLoaded() accepts undefined url', () => {
    const deploy = { url: undefined, status: 'pending' };
    const action = deployPreviewLoaded('blog', 'hello-world', deploy);
    expect(action.type).toBe(DEPLOY_PREVIEW_SUCCESS);
    expect(action.payload.url).toBeUndefined();
    expect(action.payload.status).toBe('pending');
  });

  it('deployPreviewError() returns DEPLOY_PREVIEW_FAILURE with collection and slug', () => {
    const action = deployPreviewError('posts', 'my-first-post');
    expect(action).toEqual({
      type: DEPLOY_PREVIEW_FAILURE,
      payload: { collection: 'posts', slug: 'my-first-post' },
    });
  });
});
