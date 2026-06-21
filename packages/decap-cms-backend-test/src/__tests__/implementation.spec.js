import TestBackend, { getFolderFiles } from '../implementation';

describe('test backend implementation', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('getEntry', () => {
    it('should get entry by path', async () => {
      window.repoFiles = {
        posts: {
          'some-post.md': {
            content: 'post content',
          },
        },
      };

      const backend = new TestBackend({});

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
      };

      const backend = new TestBackend({});

      await expect(backend.getEntry('posts/dir1/dir2/some-post.md')).resolves.toEqual({
        file: { path: 'posts/dir1/dir2/some-post.md', id: null },
        data: 'post content',
      });
    });
  });

  describe('persistEntry', () => {
    it('should persist entry', async () => {
      window.repoFiles = {};

      const backend = new TestBackend({});

      const entry = {
        dataFiles: [{ path: 'posts/some-post.md', raw: 'content', slug: 'some-post.md' }],
        assets: [],
      };
      await backend.persistEntry(entry, { newEntry: true });

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
      };

      const backend = new TestBackend({});

      const entry = {
        dataFiles: [{ path: 'posts/new-post.md', raw: 'content', slug: 'new-post.md' }],
        assets: [],
      };
      await backend.persistEntry(entry, { newEntry: true });

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
      window.repoFiles = {};

      const backend = new TestBackend({});

      const slug = 'dir1/dir2/some-post.md';
      const path = `posts/${slug}`;
      const entry = { dataFiles: [{ path, raw: 'content', slug }], assets: [] };
      await backend.persistEntry(entry, { newEntry: true });

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
      };

      const backend = new TestBackend({});

      const slug = 'dir1/dir2/some-post.md';
      const path = `posts/${slug}`;
      const entry = { dataFiles: [{ path, raw: 'new content', slug }], assets: [] };
      await backend.persistEntry(entry, { newEntry: false });

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
      };

      const backend = new TestBackend({});

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
      };

      const backend = new TestBackend({});

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

  describe('repoFilesUnpublished workflow', () => {
    beforeEach(() => {
      window.repoFiles = {};
      window.repoFilesUnpublished = {};
    });

    it('should initialize repoFilesUnpublished as an object map, not an array', () => {
      expect(window.repoFilesUnpublished).toEqual({});
      expect(Array.isArray(window.repoFilesUnpublished)).toBe(false);
    });

    it('should write and read an unpublished entry via persistEntry + unpublishedEntry', async () => {
      const backend = new TestBackend(
        { media_folder: 'static/media' },
        { initialWorkflowStatus: 'draft' },
      );

      const entry = {
        dataFiles: [{ path: 'posts/hello-world.md', raw: '# Hello', slug: 'hello-world' }],
        assets: [],
      };

      await backend.persistEntry(entry, {
        useWorkflow: true,
        newEntry: true,
        collectionName: 'posts',
        status: 'draft',
      });

      const key = 'posts/hello-world';
      expect(window.repoFilesUnpublished[key]).toBeDefined();
      expect(window.repoFilesUnpublished[key].slug).toBe('hello-world');
      expect(window.repoFilesUnpublished[key].collection).toBe('posts');
      expect(window.repoFilesUnpublished[key].status).toBe('draft');

      const unpublished = await backend.unpublishedEntry({
        collection: 'posts',
        slug: 'hello-world',
      });
      expect(unpublished.slug).toBe('hello-world');
      expect(unpublished.collection).toBe('posts');
      expect(unpublished.diffs[0].content).toBe('# Hello');
    });

    it('should list unpublished entry keys via unpublishedEntries', async () => {
      const backend = new TestBackend(
        { media_folder: 'static/media' },
        { initialWorkflowStatus: 'draft' },
      );

      const entry = {
        dataFiles: [{ path: 'posts/my-post.md', raw: 'body', slug: 'my-post' }],
        assets: [],
      };

      await backend.persistEntry(entry, {
        useWorkflow: true,
        newEntry: true,
        collectionName: 'posts',
        status: 'draft',
      });

      const keys = await backend.unpublishedEntries();
      expect(keys).toContain('posts/my-post');
    });
  });

  describe('getFolderFiles', () => {
    it('should get files by depth', () => {
      const tree = {
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

      expect(getFolderFiles(tree, 'pages', 'md', 1)).toEqual([
        {
          path: 'pages/root-page.md',
          content: 'root page content',
        },
      ]);
      expect(getFolderFiles(tree, 'pages', 'md', 2)).toEqual([
        {
          path: 'pages/dir1/nested-page-1.md',
          content: 'nested page 1 content',
        },
        {
          path: 'pages/root-page.md',
          content: 'root page content',
        },
      ]);
      expect(getFolderFiles(tree, 'pages', 'md', 3)).toEqual([
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
