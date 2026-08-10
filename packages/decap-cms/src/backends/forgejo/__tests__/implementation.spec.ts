import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import ForgejoImplementation from '@/backends/forgejo/implementation';
import { Cursor, CURSOR_COMPATIBILITY_SYMBOL } from '@/lib/util/index';

vi.spyOn(console, 'error').mockImplementation(() => {});

describe('forgejo backend implementation', () => {
  const config = {
    backend: {
      repo: 'owner/repo',
      api_root: 'https://codeberg.org/api/v1',
    },
  };

  const createObjectURL = vi.fn();
  global.URL = {
    createObjectURL,
  };

  createObjectURL.mockReturnValue('displayURL');

  beforeAll(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws when repo is missing and not proxied', () => {
      expect(() => new ForgejoImplementation({ backend: { api_root: 'https://codeberg.org/api/v1' } }))
        .toThrow('The Forgejo backend needs a "repo" in the backend configuration.');
    });

    it('throws when api_root is missing and not proxied', () => {
      expect(() => new ForgejoImplementation({ backend: { repo: 'owner/repo' } })).toThrow(
        'The Forgejo backend needs an "api_root" in the backend configuration.',
      );
    });

    it('defaults branch to main', () => {
      const implementation = new ForgejoImplementation(config);
      expect(implementation.branch).toEqual('main');
    });

    it('defaults apiRoot to codeberg.org when proxied and api_root is unset', () => {
      const implementation = new ForgejoImplementation({ backend: { repo: 'owner/repo' } }, {
        proxied: true,
      });
      expect(implementation.apiRoot).toEqual('https://codeberg.org/api/v1');
    });
  });

  describe('persistMedia', () => {
    const persistFiles = vi.fn();
    const mockAPI = {
      persistFiles,
    };

    persistFiles.mockImplementation((_, files) => {
      files.forEach((file, index) => {
        file.sha = index;
      });
    });

    it('should persist media file', async () => {
      const forgejoImplementation = new ForgejoImplementation(config);
      forgejoImplementation.api = mockAPI;

      const mediaFile = {
        fileObj: { size: 100, name: 'image.png' },
        path: '/media/image.png',
      };

      await expect(
        forgejoImplementation.persistMedia(mediaFile, { commitMessage: 'Persisting media' }),
      ).resolves.toEqual({
        id: 0,
        name: 'image.png',
        size: 100,
        displayURL: 'displayURL',
        path: 'media/image.png',
      });

      expect(persistFiles).toHaveBeenCalledTimes(1);
      expect(persistFiles).toHaveBeenCalledWith([], [mediaFile], {
        commitMessage: 'Persisting media',
      });
    });
  });

  describe('persistEntry', () => {
    it('should call persistFiles directly when not using the editorial workflow', async () => {
      const persistFiles = vi.fn().mockResolvedValue(undefined);
      const forgejoImplementation = new ForgejoImplementation(config);
      forgejoImplementation.api = { persistFiles };

      const entry = {
        dataFiles: [{ slug: 'entry', path: 'content/posts/entry.md', raw: 'content' }],
        assets: [],
      };
      await forgejoImplementation.persistEntry(entry, { commitMessage: 'Save entry' });

      expect(persistFiles).toHaveBeenCalledWith(entry.dataFiles, entry.assets, {
        commitMessage: 'Save entry',
      });
    });

    it('should route through editorialWorkflowGit when using the editorial workflow', async () => {
      const editorialWorkflowGit = vi.fn().mockResolvedValue(undefined);
      const forgejoImplementation = new ForgejoImplementation(config, { useWorkflow: true });
      forgejoImplementation.api = { editorialWorkflowGit };

      const entry = {
        dataFiles: [{ slug: 'entry', path: 'content/posts/entry.md', raw: 'content' }],
        assets: [],
      };
      const options = { commitMessage: 'Save entry', useWorkflow: true, collectionName: 'posts' };
      await forgejoImplementation.persistEntry(entry, options);

      expect(editorialWorkflowGit).toHaveBeenCalledWith(
        entry.dataFiles,
        'entry',
        'posts',
        options,
      );
    });
  });

  describe('unpublishedEntries', () => {
    it('returns an empty list when not using the editorial workflow', async () => {
      const forgejoImplementation = new ForgejoImplementation(config);
      forgejoImplementation.api = { listUnpublishedBranches: vi.fn() };

      await expect(forgejoImplementation.unpublishedEntries()).resolves.toEqual([]);
      expect(forgejoImplementation.api.listUnpublishedBranches).not.toHaveBeenCalled();
    });

    it('maps unpublished branches to content keys when using the editorial workflow', async () => {
      const listUnpublishedBranches = vi.fn().mockResolvedValue(['cms/posts/entry-1', 'cms/posts/entry-2']);
      const forgejoImplementation = new ForgejoImplementation(config, { useWorkflow: true });
      forgejoImplementation.api = { listUnpublishedBranches };

      await expect(forgejoImplementation.unpublishedEntries()).resolves.toEqual([
        'posts/entry-1',
        'posts/entry-2',
      ]);
    });
  });

  describe('entriesByFolder', () => {
    const listFiles = vi.fn();
    const readFile = vi.fn();
    const readFileMetadata = vi.fn(() => Promise.resolve({ author: '', updatedOn: '' }));

    const mockAPI = {
      listFiles,
      readFile,
      readFileMetadata,
      originRepoURL: 'originRepoURL',
    };

    it('should return entries and cursor', async () => {
      const forgejoImplementation = new ForgejoImplementation(config);
      forgejoImplementation.api = mockAPI;

      const files = [];
      const count = 30;
      for (let i = 0; i < count; i++) {
        const id = `${i}`.padStart(`${count}`.length, '0');
        files.push({
          id,
          path: `posts/post-${id}.md`,
        });
      }

      listFiles.mockResolvedValue(files);
      readFile.mockImplementation((_path, id) => Promise.resolve(`${id}`));

      const expectedEntries = files
        .slice(0, 20)
        .map(({ id, path }) => ({ content: { kind: 'raw', raw: id }, file: { path, id, updatedOn: '' } }));

      const expectedCursor = Cursor.create({
        actions: ['next', 'last'],
        meta: { page: 1, count, pageSize: 20, pageCount: 2 },
        data: { files },
      });

      expectedEntries[CURSOR_COMPATIBILITY_SYMBOL] = expectedCursor;

      const result = await forgejoImplementation.entriesByFolder('posts', 'md', 1);

      expect(result).toEqual(expectedEntries);
      expect(listFiles).toHaveBeenCalledTimes(1);
      expect(listFiles).toHaveBeenCalledWith('posts', { depth: 1, repoURL: 'originRepoURL' });
      expect(readFile).toHaveBeenCalledTimes(20);
    });
  });
});
