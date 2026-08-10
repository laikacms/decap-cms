import { describe, expect, it, vi } from 'vitest';

import {
  allEntriesByFolder,
  entriesByFiles,
  entriesByFolder,
  getMediaAsBlob,
  getMediaDisplayURL,
} from '@/lib/util/implementation.js';

import type { LocalForage } from '@/lib/util/localForage';

/** A `readFile` that echoes the file's id back as its text. */
function readFileById() {
  return vi.fn((_path: string, id: string | null | undefined) => Promise.resolve(`${id}`));
}

/** A `readFileMetadata` returning whatever the test wants the backend to attest to. */
function metadataOf(metadata: { author?: string, updatedOn?: string } = {}) {
  return vi.fn(() => Promise.resolve(metadata));
}

describe('implementation', () => {
  describe('getMediaAsBlob', () => {
    it('should return response blob on non svg file', async () => {
      const blob = {};
      const readFile = vi.fn().mockResolvedValue(blob);

      await expect(getMediaAsBlob('static/media/image.png', 'sha', readFile)).resolves.toBe(blob);

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/image.png', 'sha', {
        parseText: false,
      });
    });

    it('should return text blob on svg file', async () => {
      const text = 'svg';
      const readFile = vi.fn().mockResolvedValue(text);

      await expect(getMediaAsBlob('static/media/logo.svg', 'sha', readFile)).resolves.toEqual(
        new Blob([text], { type: 'image/svg+xml' }),
      );

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/logo.svg', 'sha', {
        parseText: true,
      });
    });
  });

  describe('getMediaDisplayURL', () => {
    it('should return createObjectURL result', async () => {
      const blob = {};
      const readFile = vi.fn().mockResolvedValue(blob);
      const semaphore = { take: vi.fn(callback => callback()), leave: vi.fn() };

      global.URL.createObjectURL = vi.fn().mockResolvedValue('blob:http://localhost:8080/blob-id');

      await expect(
        getMediaDisplayURL({ path: 'static/media/image.png', id: 'sha' }, readFile, semaphore),
      ).resolves.toBe('blob:http://localhost:8080/blob-id');

      expect(semaphore.take).toHaveBeenCalledTimes(1);
      expect(semaphore.leave).toHaveBeenCalledTimes(1);

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/image.png', 'sha', {
        parseText: false,
      });

      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    });
  });

  /**
   * These helpers are the single place file-backed backends (github, gitlab,
   * gitea, forgejo, bitbucket, azure, git-gateway) turn API responses into
   * `BackendEntry`, so the seam contract is asserted here once rather than in
   * each backend's suite.
   */
  describe('entriesByFiles', () => {
    it('carries file text across the seam as raw content', async () => {
      const readFile = readFileById();

      await expect(
        entriesByFiles(
          [{ path: 'posts/one.md', id: 'sha1' }],
          readFile,
          metadataOf({ author: 'Ada', updatedOn: '2026-01-02T03:04:05Z' }),
          'testAPI',
        ),
      ).resolves.toEqual([
        {
          file: {
            path: 'posts/one.md',
            id: 'sha1',
            author: { name: 'Ada' },
            updatedOn: '2026-01-02T03:04:05Z',
          },
          content: { kind: 'raw', raw: 'sha1' },
        },
      ]);

      expect(readFile).toHaveBeenCalledWith('posts/one.md', 'sha1', { parseText: true });
    });

    it('omits the author when the backend attests to none', async () => {
      const [entry] = await entriesByFiles(
        [{ path: 'posts/one.md', id: 'sha1' }],
        readFileById(),
        metadataOf({ updatedOn: '2026-01-02T03:04:05Z' }),
        'testAPI',
      );

      expect(entry.file).not.toHaveProperty('author');
    });

    it('treats an empty author string as "the backend did not say"', async () => {
      const [entry] = await entriesByFiles(
        [{ path: 'posts/one.md', id: 'sha1' }],
        readFileById(),
        metadataOf({ author: '', updatedOn: '' }),
        'testAPI',
      );

      expect(entry.file).not.toHaveProperty('author');
    });

    it('does not echo the display label back: it is collection config', async () => {
      const [entry] = await entriesByFiles(
        [{ path: 'posts/one.md', id: 'sha1', label: 'One' }],
        readFileById(),
        metadataOf(),
        'testAPI',
      );

      expect(entry.file).not.toHaveProperty('label');
    });

    it('drops files that fail to load rather than failing the whole listing', async () => {
      const readFile = vi.fn((path: string) =>
        path === 'posts/broken.md'
          ? Promise.reject(new Error('boom'))
          : Promise.resolve('# fine')
      );
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const entries = await entriesByFiles(
        [{ path: 'posts/broken.md', id: 'a' }, { path: 'posts/fine.md', id: 'b' }],
        readFile,
        metadataOf(),
        'testAPI',
      );

      expect(entries).toEqual([
        { file: { path: 'posts/fine.md', id: 'b', updatedOn: undefined }, content: { kind: 'raw', raw: '# fine' } },
      ]);

      consoleError.mockRestore();
    });
  });

  describe('entriesByFolder', () => {
    it('reads every listed file and returns raw entries in listing order', async () => {
      const listFiles = vi.fn(() =>
        Promise.resolve([
          { path: 'posts/a.md', id: 'sha-a' },
          { path: 'posts/b.md', id: 'sha-b' },
        ])
      );

      await expect(
        entriesByFolder(listFiles, readFileById(), metadataOf(), 'testAPI'),
      ).resolves.toEqual([
        { file: { path: 'posts/a.md', id: 'sha-a', updatedOn: undefined }, content: { kind: 'raw', raw: 'sha-a' } },
        { file: { path: 'posts/b.md', id: 'sha-b', updatedOn: undefined }, content: { kind: 'raw', raw: 'sha-b' } },
      ]);

      expect(listFiles).toHaveBeenCalledTimes(1);
    });

    it('returns nothing for an empty folder without reading anything', async () => {
      const readFile = readFileById();

      await expect(
        entriesByFolder(() => Promise.resolve([]), readFile, metadataOf(), 'testAPI'),
      ).resolves.toEqual([]);

      expect(readFile).not.toHaveBeenCalled();
    });
  });

  describe('allEntriesByFolder', () => {
    function fakeLocalForage() {
      const store = new Map<string, unknown>();
      return {
        getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
        setItem: vi.fn((key: string, value: unknown) => {
          store.set(key, value);
          return Promise.resolve(value);
        }),
      } as unknown as LocalForage;
    }

    function args(overrides: Record<string, unknown> = {}) {
      return {
        listAllFiles: vi.fn(() => Promise.resolve([{ path: 'posts/a.md', id: 'sha-a' }])),
        readFile: readFileById(),
        readFileMetadata: metadataOf({ author: 'Ada', updatedOn: '2026-01-02T03:04:05Z' }),
        apiName: 'testAPI',
        branch: 'main',
        localForage: fakeLocalForage(),
        folder: 'posts',
        extension: 'md',
        depth: 1,
        getDefaultBranch: vi.fn(() => Promise.resolve({ name: 'main', sha: 'head-sha' })),
        isShaExistsInBranch: vi.fn(() => Promise.resolve(true)),
        getDifferences: vi.fn(() => Promise.resolve([])),
        getFileId: vi.fn(() => Promise.resolve('id')),
        filterFile: () => true,
        ...overrides,
      } as unknown as Parameters<typeof allEntriesByFolder>[0];
    }

    it('returns raw entries and caches the listing as a local tree', async () => {
      const options = args();

      await expect(allEntriesByFolder(options)).resolves.toEqual([
        {
          file: {
            path: 'posts/a.md',
            id: 'sha-a',
            author: { name: 'Ada' },
            updatedOn: '2026-01-02T03:04:05Z',
          },
          content: { kind: 'raw', raw: 'sha-a' },
        },
      ]);

      expect(options.localForage.setItem).toHaveBeenCalledWith('git.local.main.posts.md.1', {
        head: 'head-sha',
        files: [{ id: 'sha-a', path: 'posts/a.md', name: 'a.md' }],
      });
    });

    it('serves the cached local tree without listing the folder again', async () => {
      const localForage = fakeLocalForage();
      const first = args({ localForage });
      await allEntriesByFolder(first);

      const listAllFiles = vi.fn(() => Promise.resolve([]));
      const second = args({ localForage, listAllFiles });

      await expect(allEntriesByFolder(second)).resolves.toEqual([
        {
          file: {
            path: 'posts/a.md',
            id: 'sha-a',
            author: { name: 'Ada' },
            updatedOn: '2026-01-02T03:04:05Z',
          },
          content: { kind: 'raw', raw: 'sha-a' },
        },
      ]);

      expect(listAllFiles).not.toHaveBeenCalled();
    });

    it('hands listed files to customFetch instead of reading them itself', async () => {
      const readFile = readFileById();
      const customFetch = vi.fn(() =>
        Promise.resolve([
          { file: { path: 'posts/a.md', id: 'sha-a' }, content: { kind: 'parsed' as const, data: { title: 'A' } } },
        ])
      );

      await expect(allEntriesByFolder(args({ readFile, customFetch }))).resolves.toEqual([
        { file: { path: 'posts/a.md', id: 'sha-a' }, content: { kind: 'parsed', data: { title: 'A' } } },
      ]);

      expect(customFetch).toHaveBeenCalledWith([{ path: 'posts/a.md', id: 'sha-a' }]);
      expect(readFile).not.toHaveBeenCalled();
    });

    it('rebuilds the local tree when its head is gone from the branch', async () => {
      const localForage = fakeLocalForage();
      await allEntriesByFolder(args({ localForage }));

      const listAllFiles = vi.fn(() => Promise.resolve([{ path: 'posts/b.md', id: 'sha-b' }]));
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      const entries = await allEntriesByFolder(
        args({
          localForage,
          listAllFiles,
          isShaExistsInBranch: vi.fn(() => Promise.resolve(false)),
        }),
      );

      expect(listAllFiles).toHaveBeenCalledTimes(1);
      expect(entries.map(entry => entry.file.path)).toEqual(['posts/b.md']);

      consoleLog.mockRestore();
    });
  });
});
