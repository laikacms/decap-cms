import API, { replace404WithEmptyResponse } from '../API';

global.fetch = jest.fn().mockRejectedValue(new Error('should not call fetch inside tests'));

describe('bitbucket API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should get preview statuses', async () => {
    const api = new API({});

    const pr = { id: 1 };
    const statuses = [
      { key: 'deploy', state: 'SUCCESSFUL', url: 'deploy-url' },
      { key: 'build', state: 'FAILED' },
    ];

    api.getBranchPullRequest = jest.fn(() => Promise.resolve(pr));
    api.getPullRequestStatuses = jest.fn(() => Promise.resolve(statuses));

    const collectionName = 'posts';
    const slug = 'title';
    await expect(api.getStatuses(collectionName, slug)).resolves.toEqual([
      { context: 'deploy', state: 'success', target_url: 'deploy-url' },
      { context: 'build', state: 'other' },
    ]);

    expect(api.getBranchPullRequest).toHaveBeenCalledTimes(1);
    expect(api.getBranchPullRequest).toHaveBeenCalledWith(`cms/posts/title`);

    expect(api.getPullRequestStatuses).toHaveBeenCalledTimes(1);
    expect(api.getPullRequestStatuses).toHaveBeenCalledWith(pr);
  });

  describe('mergePullRequest', () => {
    test('should pass merge_strategy: squash when squashMerges is enabled', async () => {
      const api = new API({ squashMerges: true });

      api.requestJSON = jest.fn().mockResolvedValueOnce({});

      const pullRequest = { id: 1 };
      await api.mergePullRequest(pullRequest);

      expect(api.requestJSON).toHaveBeenCalledTimes(1);
      const request = api.requestJSON.mock.calls[0][0];
      expect(JSON.parse(request.body)).toEqual(
        expect.objectContaining({ merge_strategy: 'squash' }),
      );
    });

    test('should pass merge_strategy: merge_commit when squashMerges is disabled', async () => {
      const api = new API({ squashMerges: false });

      api.requestJSON = jest.fn().mockResolvedValueOnce({});

      const pullRequest = { id: 1 };
      await api.mergePullRequest(pullRequest);

      expect(api.requestJSON).toHaveBeenCalledTimes(1);
      const request = api.requestJSON.mock.calls[0][0];
      expect(JSON.parse(request.body)).toEqual(
        expect.objectContaining({ merge_strategy: 'merge_commit' }),
      );
    });
  });

  describe('replace404WithEmptyResponse', () => {
    test('returns empty result when status is 404', () => {
      const result = replace404WithEmptyResponse({ status: 404 });
      expect(result).toEqual({ size: 0, values: [] });
    });

    test('rejects with the original error when status is not 404', async () => {
      const err = { status: 500 };
      await expect(Promise.resolve().then(() => replace404WithEmptyResponse(err))).rejects.toBe(
        err,
      );
    });
  });
});
