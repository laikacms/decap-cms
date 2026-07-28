import { beforeEach, describe, expect, test, vi } from 'vitest';

import API from '@/backends/bitbucket/API';

global.fetch = vi.fn().mockRejectedValue(new Error('should not call fetch inside tests'));

describe('bitbucket API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
});
