import { beforeEach, describe, expect, it, vi } from 'vitest';

import GraphQLAPI from '@/backends/github/GraphQLAPI';

global.fetch = vi.fn().mockRejectedValue(new Error('should not call fetch inside tests'));

describe('github GraphQL API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('editorialWorkflowGit', () => {
    it('should should flatten nested tree into a list of files', () => {
      const api = new GraphQLAPI({ branch: 'gh-pages', repo: 'owner/my-repo' });
      const entries = [
        {
          name: 'post-1.md',
          sha: 'sha-1',
          type: 'blob',
          blob: { size: 1 },
        },
        {
          name: 'post-2.md',
          sha: 'sha-2',
          type: 'blob',
          blob: { size: 2 },
        },
        {
          name: '2019',
          sha: 'dir-sha',
          type: 'tree',
          object: {
            entries: [
              {
                name: 'nested-post.md',
                sha: 'nested-post-sha',
                type: 'blob',
                blob: { size: 3 },
              },
            ],
          },
        },
      ];
      const path = 'posts';

      expect(api.getAllFiles(entries, path)).toEqual([
        {
          name: 'post-1.md',
          id: 'sha-1',
          type: 'blob',
          size: 1,
          path: 'posts/post-1.md',
        },
        {
          name: 'post-2.md',
          id: 'sha-2',
          type: 'blob',
          size: 2,
          path: 'posts/post-2.md',
        },
        {
          name: 'nested-post.md',
          id: 'nested-post-sha',
          type: 'blob',
          size: 3,
          path: 'posts/2019/nested-post.md',
        },
      ]);
    });
  });

  describe('listFiles', () => {
    it('should list files with a GraphQL query', async () => {
      const api = new GraphQLAPI({ branch: 'gh-pages', repo: 'owner/my-repo' } as any);
      (api as any).query = vi.fn().mockResolvedValue({
        data: {
          repository: {
            object: { entries: [{ name: 'post.md', sha: 'sha-1', type: 'blob', blob: { size: 1 } }] },
          },
        },
      });
      (api as any).request = vi.fn();

      await expect(api.listFiles('posts', { depth: 11 })).resolves.toEqual([
        { name: 'post.md', type: 'blob', id: 'sha-1', path: 'posts/post.md', size: 1 },
      ]);
      expect((api as any).query).toHaveBeenCalledTimes(1);
      expect((api as any).request).not.toHaveBeenCalled();
    });

    it('should use the REST API when the depth is too large for a GraphQL query', async () => {
      const api = new GraphQLAPI({ branch: 'gh-pages', repo: 'owner/my-repo' } as any);
      (api as any).query = vi.fn();
      (api as any).request = vi.fn().mockResolvedValue({
        tree: [{ path: 'a/b/post.md', type: 'blob', sha: 'sha-1', size: 1 }],
      });

      await expect(api.listFiles('posts', { depth: 100 })).resolves.toEqual([
        { name: 'post.md', type: 'blob', id: 'sha-1', path: 'posts/a/b/post.md', size: 1 },
      ]);
      expect((api as any).query).not.toHaveBeenCalled();
      expect((api as any).request).toHaveBeenCalledWith('/repos/owner/my-repo/git/trees/gh-pages:posts', {
        params: { recursive: 1 },
      });
    });
  });
});
