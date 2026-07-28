import { beforeEach, describe, expect, it, vi } from 'vitest';

import TestBackend, { getFolderFiles } from '@/backends/test/implementation';

import type { Config, PersistOptions } from '@/lib/util/index';

type RepoFile = { path?: string, content: string };
type RepoTree = { [key: string]: RepoFile | RepoTree };

const mockConfig = {
  backend: { name: 'test' },
  media_folder: 'media',
  auth: {},
} as unknown as Config;

describe('test backend implementation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('getEntry', () => {
    it('should get entry by path', async () => {
      window.repoFiles = {
        posts: {
          'some-post.md': {
            content: 'post content',
          },
        },
      } as unknown as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      await expect(backend.getEntry('posts/some-post.md')).resolves.toEqual({
        file: { path: 'posts/some-post.md', id: null },
        data: 'post content',
      });
    });

    it('should get entry by nested path', async () => {
      window.repoFiles = {
        posts: {
          dir1: {
            dir2: {
              'some-post.md': {
                content: 'post content',
              },
            },
          },
        },
      } as unknown as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      await expect(backend.getEntry('posts/dir1/dir2/some-post.md')).resolves.toEqual({
        file: { path: 'posts/dir1/dir2/some-post.md', id: null },
        data: 'post content',
      });
    });

    it('should reject when entry does not exist', async () => {
      window.repoFiles = {
        posts: {
          'some-post.md': {
            content: 'post content',
          },
        },
      } as unknown as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      await expect(backend.getEntry('posts/entries/does-not-exist.md')).rejects.toThrow(
        'Entry not found: posts/entries/does-not-exist.md',
      );
    });
  });

  describe('persistEntry', () => {
    it('should persist entry', async () => {
      window.repoFiles = {} as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      const entry = {
        dataFiles: [{ path: 'posts/some-post.md', raw: 'content', slug: 'some-post.md' }],
        assets: [],
      };
      await backend.persistEntry(entry, {
        newEntry: true,
        commitMessage: 'test',
      } as PersistOptions);

      expect(window.repoFiles).toEqual({
        posts: {
          'some-post.md': {
            content: 'content',
            path: 'posts/some-post.md',
          },
        },
      });
    });

    it('should persist entry and keep existing unrelated entries', async () => {
      window.repoFiles = {
        pages: {
          'other-page.md': {
            content: 'content',
          },
        },
        posts: {
          'other-post.md': {
            content: 'content',
          },
        },
      } as unknown as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      const entry = {
        dataFiles: [{ path: 'posts/new-post.md', raw: 'content', slug: 'new-post.md' }],
        assets: [],
      };
      await backend.persistEntry(entry, {
        newEntry: true,
        commitMessage: 'test',
      } as PersistOptions);

      expect(window.repoFiles).toEqual({
        pages: {
          'other-page.md': {
            content: 'content',
          },
        },
        posts: {
          'new-post.md': {
            content: 'content',
            path: 'posts/new-post.md',
          },
          'other-post.md': {
            content: 'content',
          },
        },
      });
    });

    it('should persist nested entry', async () => {
      window.repoFiles = {} as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      const slug = 'dir1/dir2/some-post.md';
      const path = `posts/${slug}`;
      const entry = { dataFiles: [{ path, raw: 'content', slug }], assets: [] };
      await backend.persistEntry(entry, {
        newEntry: true,
        commitMessage: 'test',
      } as PersistOptions);

      expect(window.repoFiles).toEqual({
        posts: {
          dir1: {
            dir2: {
              'some-post.md': {
                content: 'content',
                path: 'posts/dir1/dir2/some-post.md',
              },
            },
          },
        },
      });
    });

    it('should update existing nested entry', async () => {
      window.repoFiles = {
        posts: {
          dir1: {
            dir2: {
              'some-post.md': {
                mediaFiles: ['file1'],
                content: 'content',
              },
            },
          },
        },
      } as unknown as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      const slug = 'dir1/dir2/some-post.md';
      const path = `posts/${slug}`;
      const entry = { dataFiles: [{ path, raw: 'new content', slug }], assets: [] };
      await backend.persistEntry(entry, {
        newEntry: false,
        commitMessage: 'test',
      } as PersistOptions);

      expect(window.repoFiles).toEqual({
        posts: {
          dir1: {
            dir2: {
              'some-post.md': {
                path: 'posts/dir1/dir2/some-post.md',
                content: 'new content',
              },
            },
          },
        },
      });
    });
  });

  describe('deleteFiles', () => {
    it('should delete entry by path', async () => {
      window.repoFiles = {
        posts: {
          'some-post.md': {
            content: 'post content',
          },
        },
      } as unknown as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      await backend.deleteFiles(['posts/some-post.md']);
      expect(window.repoFiles).toEqual({
        posts: {},
      });
    });

    it('should delete entry by nested path', async () => {
      window.repoFiles = {
        posts: {
          dir1: {
            dir2: {
              'some-post.md': {
                content: 'post content',
              },
            },
          },
        },
      } as unknown as typeof window.repoFiles;

      const backend = new TestBackend(mockConfig);

      await backend.deleteFiles(['posts/dir1/dir2/some-post.md']);
      expect(window.repoFiles).toEqual({
        posts: {
          dir1: {
            dir2: {},
          },
        },
      });
    });
  });

  describe('getFolderFiles', () => {
    it('should get files by depth', () => {
      const tree: RepoTree = {
        pages: {
          'root-page.md': {
            content: 'root page content',
          },
          dir1: {
            'nested-page-1.md': {
              content: 'nested page 1 content',
            },
            dir2: {
              'nested-page-2.md': {
                content: 'nested page 2 content',
              },
            },
          },
        },
      };

      expect(getFolderFiles(tree as any, 'pages', 'md', 1)).toEqual([
        {
          path: 'pages/root-page.md',
          content: 'root page content',
        },
      ]);
      expect(getFolderFiles(tree as any, 'pages', 'md', 2)).toEqual([
        {
          path: 'pages/dir1/nested-page-1.md',
          content: 'nested page 1 content',
        },
        {
          path: 'pages/root-page.md',
          content: 'root page content',
        },
      ]);
      expect(getFolderFiles(tree as any, 'pages', 'md', 3)).toEqual([
        {
          path: 'pages/dir1/dir2/nested-page-2.md',
          content: 'nested page 2 content',
        },
        {
          path: 'pages/dir1/nested-page-1.md',
          content: 'nested page 1 content',
        },
        {
          path: 'pages/root-page.md',
          content: 'root page content',
        },
      ]);
    });
  });

  describe('getMedia', () => {
    const makeAssetProxy = (path: string) => ({
      path,
      fileObj: new File([new Uint8Array([137, 80, 78, 71])], path.split('/').pop() as string, {
        type: 'image/png',
      }),
      toString() {
        return `blob:${path}`;
      },
      toBase64: async () => 'iVBORw0K',
    });

    beforeEach(() => {
      window.repoFiles = {
        assets: {
          uploads: {
            'top.png': { content: makeAssetProxy('assets/uploads/top.png') },
            photos: {
              'nested.png': { content: makeAssetProxy('assets/uploads/photos/nested.png') },
            },
          },
        },
      } as unknown as typeof window.repoFiles;
    });

    it('returns a recursively-flattened file list when folderSupport is falsy', async () => {
      const backend = new TestBackend({ ...mockConfig, media_folder: 'assets/uploads' } as Config);

      const assets = await backend.getMedia('assets/uploads');

      expect(assets).toHaveLength(2);
      expect(assets.every(a => !a.isDirectory)).toBe(true);
      expect(assets.map(a => a.path).sort()).toEqual([
        'assets/uploads/photos/nested.png',
        'assets/uploads/top.png',
      ]);
    });

    it('returns only direct children, tagging subfolders as isDirectory, when folderSupport is true', async () => {
      const backend = new TestBackend({ ...mockConfig, media_folder: 'assets/uploads' } as Config);

      const assets = await backend.getMedia('assets/uploads', true);

      expect(assets).toHaveLength(2);

      const folder = assets.find(a => a.isDirectory);
      expect(folder).toMatchObject({ isDirectory: true, path: 'assets/uploads/photos', name: 'photos' });

      const file = assets.find(a => !a.isDirectory);
      expect(file).toMatchObject({ isDirectory: false, path: 'assets/uploads/top.png', name: 'top.png' });
    });
  });

  describe('entry locking', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('exposes the optional lock capability', () => {
      const backend = new TestBackend(mockConfig);
      expect(typeof backend.acquireEntryLock).toBe('function');
      expect(typeof backend.releaseEntryLock).toBe('function');
      expect(typeof backend.refreshEntryLock).toBe('function');
      expect(typeof backend.getEntryLock).toBe('function');
    });

    it('reports no lock for an untouched entry', async () => {
      const backend = new TestBackend(mockConfig);
      await expect(backend.getEntryLock('posts/lock-test-a.md')).resolves.toBeNull();
    });

    it('acquires and releases a lock, surfacing conflicts to a second owner', async () => {
      const backend = new TestBackend(mockConfig);
      const alice = { id: 'alice', name: 'Alice' };
      const bob = { id: 'bob', name: 'Bob' };

      const lock = await backend.acquireEntryLock('posts/lock-test-b.md', alice);
      expect(lock.owner).toEqual(alice);

      await expect(backend.acquireEntryLock('posts/lock-test-b.md', bob)).rejects.toThrow();

      await backend.releaseEntryLock('posts/lock-test-b.md', alice);
      await expect(backend.getEntryLock('posts/lock-test-b.md')).resolves.toBeNull();
    });

    it('shares locks across TestBackend instances (same-origin tabs)', async () => {
      const owner = { id: 'alice', name: 'Alice' };
      const tabA = new TestBackend(mockConfig);
      const tabB = new TestBackend(mockConfig);

      await tabA.acquireEntryLock('posts/lock-test-c.md', owner);
      await expect(tabB.getEntryLock('posts/lock-test-c.md')).resolves.toMatchObject({ owner });
    });
  });
});
