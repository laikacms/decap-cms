import { Cursor, CURSOR_COMPATIBILITY_SYMBOL } from 'decap-cms-lib-util';

import GitHubImplementation from '../implementation';

jest.spyOn(console, 'error').mockImplementation(() => {});

// Shared mock API instance used by branch-resolution tests
const mockAPIInstance = {
  user: jest.fn(),
  hasWriteAccess: jest.fn(),
};

jest.mock('../API', () => {
  const MockAPI = jest.fn().mockImplementation(() => mockAPIInstance);
  MockAPI.API_NAME = 'GitHub';
  return { __esModule: true, default: MockAPI, API_NAME: 'GitHub' };
});

describe('github backend implementation', () => {
  const config = {
    backend: {
      repo: 'owner/repo',
      open_authoring: false,
      api_root: 'https://api.github.com',
    },
  };

  const createObjectURL = jest.fn();
  global.URL = {
    createObjectURL,
  };

  createObjectURL.mockReturnValue('displayURL');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forkExists', () => {
    it('should return true when repo is fork and parent matches originRepo', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.currentUser = jest.fn().mockResolvedValue({ login: 'login' });

      global.fetch = jest.fn().mockResolvedValue({
        // matching should be case-insensitive
        json: () => ({ fork: true, parent: { full_name: 'OWNER/REPO' } }),
      });

      await expect(gitHubImplementation.forkExists({ token: 'token' })).resolves.toBe(true);

      expect(gitHubImplementation.currentUser).toHaveBeenCalledTimes(1);
      expect(gitHubImplementation.currentUser).toHaveBeenCalledWith({ token: 'token' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/repos/login/repo', {
        method: 'GET',
        headers: {
          Authorization: 'token token',
        },
        signal: expect.any(AbortSignal),
      });
    });

    it('should return false when repo is not a fork', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.currentUser = jest.fn().mockResolvedValue({ login: 'login' });

      global.fetch = jest.fn().mockResolvedValue({
        // matching should be case-insensitive
        json: () => ({ fork: false }),
      });

      expect.assertions(1);
      await expect(gitHubImplementation.forkExists({ token: 'token' })).resolves.toBe(false);
    });

    it("should return false when parent doesn't match originRepo", async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.currentUser = jest.fn().mockResolvedValue({ login: 'login' });

      global.fetch = jest.fn().mockResolvedValue({
        json: () => ({ fork: true, parent: { full_name: 'owner/other_repo' } }),
      });

      expect.assertions(1);
      await expect(gitHubImplementation.forkExists({ token: 'token' })).resolves.toBe(false);
    });
  });

  describe('persistMedia', () => {
    const persistFiles = jest.fn();
    const mockAPI = {
      persistFiles,
    };

    persistFiles.mockImplementation((_, files) => {
      files.forEach((file, index) => {
        file.sha = index;
      });
    });

    it('should persist media file', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = mockAPI;

      const mediaFile = {
        fileObj: { size: 100, name: 'image.png' },
        path: '/media/image.png',
      };

      expect.assertions(5);
      await expect(gitHubImplementation.persistMedia(mediaFile, {})).resolves.toEqual({
        id: 0,
        name: 'image.png',
        size: 100,
        displayURL: 'displayURL',
        path: 'media/image.png',
      });

      expect(persistFiles).toHaveBeenCalledTimes(1);
      expect(persistFiles).toHaveBeenCalledWith([], [mediaFile], {});
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledWith(mediaFile.fileObj);
    });

    it('should log and throw error on "persistFiles" error', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = mockAPI;

      const error = new Error('failed to persist files');
      persistFiles.mockRejectedValue(error);

      const mediaFile = {
        value: 'image.png',
        fileObj: { size: 100 },
        path: '/media/image.png',
      };

      expect.assertions(5);
      await expect(gitHubImplementation.persistMedia(mediaFile)).rejects.toThrowError(error);

      expect(persistFiles).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledTimes(0);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(error);
    });
  });

  describe('unpublishedEntry', () => {
    const generateContentKey = jest.fn();
    const retrieveUnpublishedEntryData = jest.fn();

    const mockAPI = {
      generateContentKey,
      retrieveUnpublishedEntryData,
    };

    it('should return unpublished entry data', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = mockAPI;
      gitHubImplementation.loadEntryMediaFiles = jest
        .fn()
        .mockResolvedValue([{ path: 'image.png', id: 'sha' }]);

      generateContentKey.mockReturnValue('contentKey');

      const data = {
        collection: 'collection',
        slug: 'slug',
        status: 'draft',
        diffs: [],
        updatedAt: 'updatedAt',
      };
      retrieveUnpublishedEntryData.mockResolvedValue(data);

      const collection = 'posts';
      const slug = 'slug';
      await expect(gitHubImplementation.unpublishedEntry({ collection, slug })).resolves.toEqual(
        data,
      );

      expect(generateContentKey).toHaveBeenCalledTimes(1);
      expect(generateContentKey).toHaveBeenCalledWith('posts', 'slug');

      expect(retrieveUnpublishedEntryData).toHaveBeenCalledTimes(1);
      expect(retrieveUnpublishedEntryData).toHaveBeenCalledWith('contentKey');
    });
  });

  describe('entriesByFolder', () => {
    const listFiles = jest.fn();
    const readFile = jest.fn();
    const readFileMetadata = jest.fn(() => Promise.resolve({ author: '', updatedOn: '' }));

    const mockAPI = {
      listFiles,
      readFile,
      readFileMetadata,
      originRepoURL: 'originRepoURL',
    };

    it('should return entries and cursor', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = mockAPI;

      const files = [];
      const count = 1501;
      for (let i = 0; i < count; i++) {
        const id = `${i}`.padStart(`${count}`.length, '0');
        files.push({
          id,
          path: `posts/post-${id}.md`,
        });
      }

      listFiles.mockResolvedValue(files);
      readFile.mockImplementation((path, id) => Promise.resolve(`${id}`));

      const expectedEntries = files
        .slice(0, 20)
        .map(({ id, path }) => ({ data: id, file: { path, id, author: '', updatedOn: '' } }));

      const expectedCursor = Cursor.create({
        actions: ['next', 'last'],
        meta: { page: 1, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      expectedEntries[CURSOR_COMPATIBILITY_SYMBOL] = expectedCursor;

      const result = await gitHubImplementation.entriesByFolder('posts', 'md', 1);

      expect(result).toEqual(expectedEntries);
      expect(listFiles).toHaveBeenCalledTimes(1);
      expect(listFiles).toHaveBeenCalledWith('posts', { depth: 1, repoURL: 'originRepoURL' });
      expect(readFile).toHaveBeenCalledTimes(20);
    });
  });

  describe('traverseCursor', () => {
    const listFiles = jest.fn();
    const readFile = jest.fn((path, id) => Promise.resolve(`${id}`));
    const readFileMetadata = jest.fn(() => Promise.resolve({}));

    const mockAPI = {
      listFiles,
      readFile,
      originRepoURL: 'originRepoURL',
      readFileMetadata,
    };

    const files = [];
    const count = 1501;
    for (let i = 0; i < count; i++) {
      const id = `${i}`.padStart(`${count}`.length, '0');
      files.push({
        id,
        path: `posts/post-${id}.md`,
      });
    }

    it('should handle next action', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = mockAPI;

      const cursor = Cursor.create({
        actions: ['next', 'last'],
        meta: { page: 1, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      const expectedEntries = files
        .slice(20, 40)
        .map(({ id, path }) => ({ data: id, file: { path, id } }));

      const expectedCursor = Cursor.create({
        actions: ['prev', 'first', 'next', 'last'],
        meta: { page: 2, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      const result = await gitHubImplementation.traverseCursor(cursor, 'next');

      expect(result).toEqual({
        entries: expectedEntries,
        cursor: expectedCursor,
      });
    });

    it('should handle prev action', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = mockAPI;

      const cursor = Cursor.create({
        actions: ['prev', 'first', 'next', 'last'],
        meta: { page: 2, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      const expectedEntries = files
        .slice(0, 20)
        .map(({ id, path }) => ({ data: id, file: { path, id } }));

      const expectedCursor = Cursor.create({
        actions: ['next', 'last'],
        meta: { page: 1, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      const result = await gitHubImplementation.traverseCursor(cursor, 'prev');

      expect(result).toEqual({
        entries: expectedEntries,
        cursor: expectedCursor,
      });
    });

    it('should handle last action', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = mockAPI;

      const cursor = Cursor.create({
        actions: ['next', 'last'],
        meta: { page: 1, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      const expectedEntries = files
        .slice(1500)
        .map(({ id, path }) => ({ data: id, file: { path, id } }));

      const expectedCursor = Cursor.create({
        actions: ['prev', 'first'],
        meta: { page: 76, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      const result = await gitHubImplementation.traverseCursor(cursor, 'last');

      expect(result).toEqual({
        entries: expectedEntries,
        cursor: expectedCursor,
      });
    });

    it('should handle first action', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = mockAPI;

      const cursor = Cursor.create({
        actions: ['prev', 'first'],
        meta: { page: 76, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      const expectedEntries = files
        .slice(0, 20)
        .map(({ id, path }) => ({ data: id, file: { path, id } }));

      const expectedCursor = Cursor.create({
        actions: ['next', 'last'],
        meta: { page: 1, count, pageSize: 20, pageCount: 76 },
        data: { files },
      });

      const result = await gitHubImplementation.traverseCursor(cursor, 'first');

      expect(result).toEqual({
        entries: expectedEntries,
        cursor: expectedCursor,
      });
    });
  });

  describe('branch resolution in authenticate()', () => {
    beforeEach(() => {
      mockAPIInstance.user.mockResolvedValue({ login: 'testuser' });
      mockAPIInstance.hasWriteAccess.mockResolvedValue(true);
    });

    it('uses configured branch value and does not call GitHub repo info API', async () => {
      const impl = new GitHubImplementation({
        backend: { repo: 'owner/repo', branch: 'my-configured-branch' },
      });

      global.fetch = jest.fn().mockResolvedValue({
        json: () => ({ default_branch: 'should-not-be-used' }),
      });

      await impl.authenticate({ token: 'test-token' });

      expect(impl.branch).toBe('my-configured-branch');
      const repoCalls = global.fetch.mock.calls.filter(([url]) =>
        String(url).includes('/repos/owner/repo'),
      );
      expect(repoCalls).toHaveLength(0);
    });

    it('resolves branch from GitHub API default_branch when branch is not configured', async () => {
      const impl = new GitHubImplementation({
        backend: { repo: 'owner/repo' },
      });

      global.fetch = jest.fn().mockResolvedValue({
        json: () => ({ default_branch: 'main' }),
      });

      await impl.authenticate({ token: 'test-token' });

      expect(impl.branch).toBe('main');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo',
        expect.objectContaining({ headers: { Authorization: 'token test-token' } }),
      );
    });

    it('falls back to master when branch is not configured and fetch throws', async () => {
      const impl = new GitHubImplementation({
        backend: { repo: 'owner/repo' },
      });

      global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

      await impl.authenticate({ token: 'test-token' });

      expect(impl.branch).toBe('master');
    });

    it('falls back to master when branch is not configured and API response lacks default_branch', async () => {
      const impl = new GitHubImplementation({
        backend: { repo: 'owner/repo' },
      });

      global.fetch = jest.fn().mockResolvedValue({
        json: () => ({}),
      });

      await impl.authenticate({ token: 'test-token' });

      expect(impl.branch).toBe('master');
    });
  });

  describe('authenticateWithFork — default branch resolution (DCMS-175)', () => {
    const openAuthoringConfig = {
      backend: {
        repo: 'owner/repo',
        open_authoring: true,
        api_root: 'https://api.github.com',
      },
      useWorkflow: true,
    };

    it('uses default_branch from origin repo API when branch is not configured', async () => {
      const impl = new GitHubImplementation(openAuthoringConfig, { useWorkflow: true });

      impl.userIsOriginMaintainer = jest.fn().mockResolvedValue(false);
      impl.currentUser = jest.fn().mockResolvedValue({ login: 'forkuser' });
      impl.forkExists = jest.fn().mockResolvedValue(true);

      global.fetch = jest.fn().mockImplementation(url => {
        const urlStr = String(url);
        if (urlStr.includes('/repos/owner/repo') && !urlStr.includes('merge-upstream')) {
          return Promise.resolve({ json: () => ({ default_branch: 'main' }) });
        }
        return Promise.resolve({ json: () => ({}) });
      });

      await impl.authenticateWithFork({
        userData: { token: 'test-token' },
        getPermissionToFork: jest.fn(),
      });

      const mergeUpstreamCall = global.fetch.mock.calls.find(([url]) =>
        String(url).includes('merge-upstream'),
      );
      expect(mergeUpstreamCall).toBeDefined();
      const body = JSON.parse(mergeUpstreamCall[1].body);
      expect(body.branch).toBe('main');
    });

    it('uses master as fallback when default_branch fetch fails', async () => {
      const impl = new GitHubImplementation(openAuthoringConfig, { useWorkflow: true });

      impl.userIsOriginMaintainer = jest.fn().mockResolvedValue(false);
      impl.currentUser = jest.fn().mockResolvedValue({ login: 'forkuser' });
      impl.forkExists = jest.fn().mockResolvedValue(true);

      global.fetch = jest.fn().mockImplementation(url => {
        const urlStr = String(url);
        if (urlStr.includes('/repos/owner/repo') && !urlStr.includes('merge-upstream')) {
          return Promise.reject(new Error('network error'));
        }
        return Promise.resolve({ json: () => ({}) });
      });

      await impl.authenticateWithFork({
        userData: { token: 'test-token' },
        getPermissionToFork: jest.fn(),
      });

      const mergeUpstreamCall = global.fetch.mock.calls.find(([url]) =>
        String(url).includes('merge-upstream'),
      );
      expect(mergeUpstreamCall).toBeDefined();
      const body = JSON.parse(mergeUpstreamCall[1].body);
      expect(body.branch).toBe('master');
    });

    it('does not re-fetch default_branch when authenticate is called after authenticateWithFork', async () => {
      const impl = new GitHubImplementation(openAuthoringConfig, { useWorkflow: true });

      impl.userIsOriginMaintainer = jest.fn().mockResolvedValue(false);
      impl.currentUser = jest.fn().mockResolvedValue({ login: 'forkuser' });
      impl.forkExists = jest.fn().mockResolvedValue(true);

      mockAPIInstance.user.mockResolvedValue({ login: 'forkuser' });
      mockAPIInstance.hasWriteAccess.mockResolvedValue(true);

      global.fetch = jest.fn().mockImplementation(url => {
        const urlStr = String(url);
        if (urlStr.includes('/repos/owner/repo') && !urlStr.includes('merge-upstream')) {
          return Promise.resolve({ json: () => ({ default_branch: 'main' }) });
        }
        return Promise.resolve({ json: () => ({}) });
      });

      await impl.authenticateWithFork({
        userData: { token: 'test-token' },
        getPermissionToFork: jest.fn(),
      });
      await impl.authenticate({ token: 'test-token' });

      const repoInfoCalls = global.fetch.mock.calls.filter(
        ([url]) => String(url) === 'https://api.github.com/repos/owner/repo',
      );
      // Should only fetch repo info once, not twice
      expect(repoInfoCalls).toHaveLength(1);
      expect(impl.branch).toBe('main');
    });
  });

  describe('graphql_api_root', () => {
    it('defaults graphqlApiRoot to apiRoot when graphql_api_root is not set', () => {
      const impl = new GitHubImplementation({
        backend: { repo: 'owner/repo', api_root: 'https://api.github.com' },
      });
      expect(impl.graphqlApiRoot).toBe('https://api.github.com');
    });

    it('uses graphql_api_root when set', () => {
      const impl = new GitHubImplementation({
        backend: {
          repo: 'owner/repo',
          api_root: 'https://api.github.com',
          graphql_api_root: 'https://github.example.com/api',
        },
      });
      expect(impl.graphqlApiRoot).toBe('https://github.example.com/api');
    });

    it('graphqlApiRoot is independent of apiRoot', () => {
      const impl = new GitHubImplementation({
        backend: {
          repo: 'owner/repo',
          api_root: 'https://rest.example.com',
          graphql_api_root: 'https://graphql.example.com',
        },
      });
      expect(impl.apiRoot).toBe('https://rest.example.com');
      expect(impl.graphqlApiRoot).toBe('https://graphql.example.com');
    });
  });
});
