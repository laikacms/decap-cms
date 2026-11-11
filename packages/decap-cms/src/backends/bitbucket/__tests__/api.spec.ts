import { beforeEach, describe, expect, test, vi } from 'vitest';

import API from '@/backends/bitbucket/API';

global.fetch = vi.fn().mockRejectedValue(new Error('should not call fetch inside tests'));

const BITBUCKET = 'https://api.bitbucket.org/2.0';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
  };
}

function fetchedURLs() {
  return vi.mocked(global.fetch).mock.calls.map(([url]) => url);
}

describe('bitbucket API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // `resetAllMocks` also clears this, so set it again before every test.
    vi.mocked(global.fetch).mockRejectedValue(new Error('should not call fetch inside tests'));
  });

  test('should get preview statuses', async () => {
    const api = new API({});

    const pr = { id: 1 };
    const statuses = [
      { key: 'deploy', state: 'SUCCESSFUL', url: 'deploy-url' },
      { key: 'build', state: 'FAILED' },
    ];

    api.getBranchPullRequest = vi.fn(() => Promise.resolve(pr));
    api.getPullRequestStatuses = vi.fn(() => Promise.resolve(statuses));

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

  test('should retrieve unpublished entry data with stable, non-empty diff ids', async () => {
    const api = new API({});

    const pr = { id: 1, updated_on: '2020-01-01T00:00:00Z', author: { display_name: 'author' } };
    const diffs = [
      { path: 'content/posts/title.md', newFile: false, status: 'modified' },
      { path: 'content/posts/removed.md', newFile: false, status: 'deleted' },
    ];
    const branchSha = 'abc123';

    api.getBranchPullRequest = vi.fn(() => Promise.resolve(pr));
    api.getDifferences = vi.fn(() => Promise.resolve(diffs));
    api.getPullRequestLabel = vi.fn(() => Promise.resolve('draft'));
    api.branchCommitSha = vi.fn(() => Promise.resolve(branchSha));

    const result = await api.retrieveUnpublishedEntryData('posts/title');

    expect(result.diffs).toEqual([
      {
        path: 'content/posts/title.md',
        newFile: false,
        id: `${branchSha}/content/posts/title.md`,
      },
    ]);
    result.diffs.forEach(diff => {
      expect(diff.id).not.toEqual('');
    });
  });

  describe('processFiles', () => {
    const rawFiles = [
      { id: 'a1', type: 'commit_file', path: 'media/image.png' },
      { id: 'a2', type: 'commit_directory', path: 'media/dir1' },
    ];

    test('filters out directories by default', () => {
      const api = new API({});
      expect(api.processFiles(rawFiles)).toEqual([
        { id: 'a1', type: 'commit_file', path: 'media/image.png', name: 'image.png' },
      ]);
    });

    test('includes directories as isDirectory-detectable entries when folderSupport is set', () => {
      const api = new API({});
      expect(api.processFiles(rawFiles, true)).toEqual([
        { id: 'a1', type: 'commit_file', path: 'media/image.png', name: 'image.png' },
        { id: 'a2', type: 'commit_directory', path: 'media/dir1', name: 'dir1' },
      ]);
    });
  });

  describe('pagination', () => {
    const fetchMock = () => vi.mocked(global.fetch) as any;

    test('should send later pages to the configured api root', async () => {
      const api = new API({ apiRoot: 'https://proxy.example.com/bitbucket/2.0' } as any);
      fetchMock()
        .mockResolvedValueOnce(jsonResponse({ values: [1], next: `${BITBUCKET}/repositories/owner/repo/items?page=2` }))
        .mockResolvedValueOnce(jsonResponse({ values: [2] }));

      await expect(api.requestAllValues({ url: '/repositories/owner/repo/items' })).resolves.toEqual([1, 2]);

      expect(fetchedURLs()).toEqual([
        'https://proxy.example.com/bitbucket/2.0/repositories/owner/repo/items',
        'https://proxy.example.com/bitbucket/2.0/repositories/owner/repo/items?page=2',
      ]);
    });

    test('should stop when a next link repeats', async () => {
      const api = new API({} as any);
      const next = `${BITBUCKET}/repositories/owner/repo/items?page=2`;
      fetchMock()
        .mockResolvedValueOnce(jsonResponse({ values: [1], next }))
        .mockResolvedValueOnce(jsonResponse({ values: [2], next }));

      await expect(api.requestAllValues({ url: '/repositories/owner/repo/items' })).resolves.toEqual([1, 2]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should get pull requests from every page', async () => {
      const api = new API({ repo: 'owner/repo', branch: 'main', cmsLabelPrefix: 'decap-cms/' } as any);
      // Bitbucket writes the spaces in a `next` link's query as `+`.
      const next = `${BITBUCKET}/repositories/owner/repo/pullrequests?pagelen=50`
        + '&q=state+%3D+%22OPEN%22+AND+source.branch.name+~+%22cms%2F%22&page=2';
      fetchMock()
        .mockResolvedValueOnce(jsonResponse({ values: [{ id: 1 }, { id: 2 }], next }))
        .mockResolvedValueOnce(jsonResponse({ values: [{ id: 3 }] }));
      api.getPullRequestLabel = vi.fn((id: number) => Promise.resolve(id === 2 ? 'other' : 'decap-cms/draft'));

      await expect(api.getPullRequests()).resolves.toEqual([{ id: 1 }, { id: 3 }]);

      const urls = fetchedURLs();
      expect(urls).toHaveLength(2);
      expect(urls[0]).toContain(`${BITBUCKET}/repositories/owner/repo/pullrequests?pagelen=50&q=`);
      expect(urls[1]).toBe(
        `${BITBUCKET}/repositories/owner/repo/pullrequests?pagelen=50`
          + '&q=state%20%3D%20%22OPEN%22%20AND%20source.branch.name%20~%20%22cms%2F%22&page=2',
      );
      expect(api.getPullRequestLabel).toHaveBeenCalledTimes(3);
    });

    test('should list each pull request once, most recently updated first', async () => {
      const api = new API({ repo: 'owner/repo', branch: 'main', cmsLabelPrefix: 'decap-cms/' } as any);
      const first = { id: 1, updated_on: '2026-01-01T00:00:00.000000+00:00' };
      const second = { id: 2, updated_on: '2026-03-01T00:00:00.000000+00:00' };
      const third = { id: 3, updated_on: '2026-02-01T00:00:00.000000+00:00' };
      fetchMock()
        .mockResolvedValueOnce(
          jsonResponse({
            values: [first, second],
            next: `${BITBUCKET}/repositories/owner/repo/pullrequests?sort=id&page=2`,
          }),
        )
        // The second pull request moved onto this page while the pages loaded.
        .mockResolvedValueOnce(jsonResponse({ values: [second, third] }));
      api.getPullRequestLabel = vi.fn(() => Promise.resolve('decap-cms/draft'));

      await expect(api.getPullRequests()).resolves.toEqual([second, third, first]);

      expect(new URL(fetchedURLs()[0] as string).searchParams.get('sort')).toBe('id');
      expect(api.getPullRequestLabel).toHaveBeenCalledTimes(3);
    });

    test('should request at most 10 pull request labels at a time', async () => {
      const api = new API({ repo: 'owner/repo', branch: 'main', cmsLabelPrefix: 'decap-cms/' } as any);
      const pullRequests = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }));
      fetchMock().mockResolvedValueOnce(jsonResponse({ values: pullRequests }));
      let active = 0;
      let maxActive = 0;
      api.getPullRequestLabel = vi.fn(async (id: number) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 0));
        active--;
        return id === 2 ? 'other' : 'decap-cms/draft';
      });

      const result = await api.getPullRequests();

      expect(result).toHaveLength(24);
      expect(result).not.toContainEqual({ id: 2 });
      expect(api.getPullRequestLabel).toHaveBeenCalledTimes(25);
      expect(maxActive).toBe(10);
    });

    test('should read the status label from the last page of comments', async () => {
      const api = new API({ repo: 'owner/repo' } as any);
      fetchMock()
        .mockResolvedValueOnce(
          jsonResponse({
            values: [{ content: { raw: 'decap-cms/draft' } }, { content: { raw: 'Looks good' } }],
            next: `${BITBUCKET}/repositories/owner/repo/pullrequests/1/comments?pagelen=100&page=2`,
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ values: [{ content: { raw: 'decap-cms/pending_publish' } }] }));

      await expect(api.getPullRequestLabel(1)).resolves.toBe('decap-cms/pending_publish');

      expect(fetchedURLs()).toEqual([
        `${BITBUCKET}/repositories/owner/repo/pullrequests/1/comments?pagelen=100`,
        `${BITBUCKET}/repositories/owner/repo/pullrequests/1/comments?pagelen=100&page=2`,
      ]);
    });

    test('should get pull request statuses from every page', async () => {
      const api = new API({ repo: 'owner/repo' } as any);
      fetchMock()
        .mockResolvedValueOnce(
          jsonResponse({
            values: [{ key: 'build' }],
            next: `${BITBUCKET}/repositories/owner/repo/pullrequests/1/statuses?pagelen=100&page=2`,
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ values: [{ key: 'deploy' }] }));

      await expect(api.getPullRequestStatuses({ id: 1 } as any)).resolves.toEqual([
        { key: 'build' },
        { key: 'deploy' },
      ]);
    });

    test('should list the files from every page', async () => {
      const api = new API({ repo: 'owner/repo' } as any);
      api.branchCommitSha = vi.fn(() => Promise.resolve('sha'));
      fetchMock()
        .mockResolvedValueOnce(
          jsonResponse({
            values: [
              { type: 'commit_file', path: 'media/a.png', commit: { hash: 'sha' } },
              { type: 'commit_directory', path: 'media/sub' },
            ],
            next: `${BITBUCKET}/repositories/owner/repo/src/sha/media?max_depth=1&pagelen=100&page=abc`,
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ values: [{ type: 'commit_file', path: 'media/b.png', commit: { hash: 'sha' } }] }),
        );

      await expect(api.listAllFiles('media', 1, 'main')).resolves.toEqual([
        { id: 'sha/media/a.png', type: 'commit_file', path: 'media/a.png', name: 'a.png' },
        { id: 'sha/media/b.png', type: 'commit_file', path: 'media/b.png', name: 'b.png' },
      ]);

      expect(fetchedURLs()).toEqual([
        `${BITBUCKET}/repositories/owner/repo/src/sha/media?max_depth=1&pagelen=100`,
        `${BITBUCKET}/repositories/owner/repo/src/sha/media?max_depth=1&pagelen=100&page=abc`,
      ]);
    });

    test('should return no files for a missing folder', async () => {
      const api = new API({ repo: 'owner/repo' } as any);
      api.branchCommitSha = vi.fn(() => Promise.resolve('sha'));
      fetchMock().mockResolvedValueOnce(
        jsonResponse({ type: 'error', error: { message: 'No such file or directory' } }, 404),
      );

      await expect(api.listAllFiles('media', 1, 'main')).resolves.toEqual([]);
    });
  });
});
