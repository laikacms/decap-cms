import { beforeEach, describe, expect, it, vi } from 'vitest';

import TestBackend, { getFolderFiles } from '../implementation';

import type { Config, PersistOptions } from '../../../lib/util/index';

type RepoFile = { path?: string; content: string };
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
});
