import {
  deployPreviewLoading,
  deployPreviewLoaded,
  deployPreviewError,
  DEPLOY_PREVIEW_REQUEST,
  DEPLOY_PREVIEW_SUCCESS,
  DEPLOY_PREVIEW_FAILURE,
} from '../deploys';

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
