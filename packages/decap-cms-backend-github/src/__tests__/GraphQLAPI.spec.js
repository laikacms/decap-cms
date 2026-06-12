import GraphQLAPI from '../GraphQLAPI';

global.fetch = jest.fn().mockRejectedValue(new Error('should not call fetch inside tests'));

describe('github GraphQL API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getBranchQualifiedName', () => {
    it('should prefix branch name with refs/heads/', () => {
      const api = new GraphQLAPI({ branch: 'main', repo: 'owner/repo' });
      expect(api.getBranchQualifiedName('my-feature')).toBe('refs/heads/my-feature');
    });
  });

  describe('getBranchQuery', () => {
    it('should return query object with correct variables', () => {
      const api = new GraphQLAPI({ branch: 'main', repo: 'owner/repo' });
      const result = api.getBranchQuery('main', 'myowner', 'myrepo');
      expect(result.variables.qualifiedName).toBe('refs/heads/main');
      expect(result.variables.owner).toBe('myowner');
      expect(result.variables.name).toBe('myrepo');
    });
  });

  describe('getOwnerAndNameFromRepoUrl', () => {
    const repoOwner = 'owner';
    const repoName = 'my-repo';
    const originRepoOwner = 'fork-owner';
    const originRepoName = 'my-forked-repo';

    it('should return owner and name for the main repo URL', () => {
      const api = new GraphQLAPI({
        branch: 'main',
        repo: `${repoOwner}/${repoName}`,
        originRepo: `${originRepoOwner}/${originRepoName}`,
      });
      expect(api.getOwnerAndNameFromRepoUrl(api.repoURL)).toEqual({
        owner: repoOwner,
        name: repoName,
      });
    });

    it('should return origin owner and name for the originRepoURL (fork/open-authoring path)', () => {
      const api = new GraphQLAPI({
        branch: 'main',
        repo: `${repoOwner}/${repoName}`,
        originRepo: `${originRepoOwner}/${originRepoName}`,
      });
      expect(api.getOwnerAndNameFromRepoUrl(api.originRepoURL)).toEqual({
        owner: originRepoOwner,
        name: originRepoName,
      });
    });
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
});
