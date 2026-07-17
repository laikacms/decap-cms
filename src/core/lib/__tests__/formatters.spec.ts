vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.mock('../../reducers/collections', () => ({
  selectIdentifier: vi.fn(),
  selectInferredField: vi.fn(),
  getFileFromSlug: vi.fn(),
  selectEntrySlug: vi.fn(),
  selectField: vi.fn(),
  default: (state: unknown) => state,
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  commitMessageFormatter,
  folderFormatter,
  getProcessSegment,
  prepareSlug,
  previewUrlFormatter,
  slugFormatter,
  summaryFormatter,
} from '@/core/lib/formatters';
import { getFileFromSlug, selectIdentifier, selectInferredField } from '@/core/reducers/collections';

describe('formatters', () => {
  describe('commitMessageFormatter', () => {
    const config = {
      backend: {
        name: 'git-gateway',
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return default commit message on create, label_singular', () => {
      const collection = { label_singular: 'Collection' };

      expect(
        commitMessageFormatter('create', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
        }),
      ).toEqual('Create Collection "doc-slug"');
    });

    it('should return default commit message on create, label', () => {
      const collection = { label: 'Collections' };

      expect(
        commitMessageFormatter('update', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
        }),
      ).toEqual('Update Collections "doc-slug"');
    });

    it('should return default commit message on delete', () => {
      const collection = { label_singular: 'Collection' };

      expect(
        commitMessageFormatter('delete', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
        }),
      ).toEqual('Delete Collection "doc-slug"');
    });

    it('should return default commit message on uploadMedia', () => {
      const collection = {};

      expect(
        commitMessageFormatter('uploadMedia', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
        }),
      ).toEqual('Upload "file-path"');
    });

    it('should return default commit message on deleteMedia', () => {
      const collection = {};

      expect(
        commitMessageFormatter('deleteMedia', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
        }),
      ).toEqual('Delete "file-path"');
    });

    it('should log warning on unknown variable', () => {
      const config = {
        backend: {
          commit_messages: {
            create: 'Create {{collection}} "{{slug}}" with "{{unknown variable}}"',
          },
        },
      };
      const collection = { label_singular: 'Collection' };
      expect(
        commitMessageFormatter('create', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
        }),
      ).toEqual('Create Collection "doc-slug" with ""');
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        'Ignoring unknown variable "unknown variable" in commit message template.',
      );
    });

    it('should return custom commit message on update', () => {
      const config = {
        backend: {
          commit_messages: {
            update: 'Custom commit message',
          },
        },
      };
      const collection = {};
      expect(
        commitMessageFormatter('update', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
        }),
      ).toEqual('Custom commit message');
    });

    it('should use empty values if "authorLogin" and "authorName" are missing in commit message', () => {
      const config = {
        backend: {
          commit_messages: {
            update: '{{author-login}} - {{author-name}}: Create {{collection}} "{{slug}}"',
          },
        },
      };
      const collection = { label_singular: 'Collection' };
      expect(
        commitMessageFormatter(
          'update',
          config,
          {
            slug: 'doc-slug',
            path: 'file-path',
            collection,
          },
          true,
        ),
      ).toEqual(' - : Create Collection "doc-slug"');
    });

    it('should return custom create message with author information', () => {
      const config = {
        backend: {
          commit_messages: {
            create: '{{author-login}} - {{author-name}}: Create {{collection}} "{{slug}}"',
          },
        },
      };
      const collection = { label_singular: 'Collection' };
      expect(
        commitMessageFormatter(
          'create',
          config,
          {
            slug: 'doc-slug',
            path: 'file-path',
            collection,
            authorLogin: 'user-login',
            authorName: 'Test User',
          },
          true,
        ),
      ).toEqual('user-login - Test User: Create Collection "doc-slug"');
    });

    it('should return custom open authoring message', () => {
      const config = {
        backend: {
          commit_messages: {
            openAuthoring: '{{author-login}} - {{author-name}}: {{message}}',
          },
        },
      };
      const collection = { label_singular: 'Collection' };
      expect(
        commitMessageFormatter(
          'create',
          config,
          {
            slug: 'doc-slug',
            path: 'file-path',
            collection,
            authorLogin: 'user-login',
            authorName: 'Test User',
          },
          true,
        ),
      ).toEqual('user-login - Test User: Create Collection "doc-slug"');
    });

    it('should use empty values if "authorLogin" and "authorName" are missing in open authoring message', () => {
      const config = {
        backend: {
          commit_messages: {
            openAuthoring: '{{author-login}} - {{author-name}}: {{message}}',
          },
        },
      };
      const collection = { label_singular: 'Collection' };
      expect(
        commitMessageFormatter(
          'create',
          config,
          {
            slug: 'doc-slug',
            path: 'file-path',
            collection,
          },
          true,
        ),
      ).toEqual(' - : Create Collection "doc-slug"');
    });

    it('should log warning on unknown variable in open authoring template', () => {
      const config = {
        backend: {
          commit_messages: {
            openAuthoring: '{{author-email}}: {{message}}',
          },
        },
      };
      const collection = { label_singular: 'Collection' };
      commitMessageFormatter(
        'create',
        config,
        {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
          authorLogin: 'user-login',
          authorName: 'Test User',
        },
        true,
      );

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        'Ignoring unknown variable "author-email" in open authoring message template.',
      );
    });

    it('replaces an unknown placeholder in a user-supplied commit_messages.create template with an empty string (DCMS-562)', () => {
      const config = {
        backend: {
          commit_messages: {
            create: 'Create {{collection}}: {{not-a-real-placeholder}}',
          },
        },
      };
      const collection = { label_singular: 'Collection' };

      expect(
        commitMessageFormatter('create', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
        }),
      ).toEqual('Create Collection: ');
      expect(console.warn).toHaveBeenCalledWith(
        'Ignoring unknown variable "not-a-real-placeholder" in commit message template.',
      );
    });

    it('should return commit with trailer when signoff_commits is enabled', () => {
      const collection = { label_singular: 'Collection' };
      const config = {
        backend: {
          signoff_commits: true,
        },
      };

      expect(
        commitMessageFormatter('create', config, {
          slug: 'doc-slug',
          path: 'file-path',
          collection,
          authorName: 'Test User',
          authorEmail: 'test-user@example.org',
        }),
      ).toEqual(
        'Create Collection "doc-slug"\n\nSigned-off-by: Test User <test-user@example.org>\n',
      );
    });
  });

  describe('prepareSlug', () => {
    it('should trim slug', () => {
      expect(prepareSlug(' slug ')).toBe('slug');
    });

    it('should lowercase slug', () => {
      expect(prepareSlug('Slug')).toBe('slug');
    });

    it('should remove single quotes', () => {
      expect(prepareSlug(`sl'ug`)).toBe('slug');
    });

    it('should replace periods with slashes', () => {
      expect(prepareSlug(`sl.ug`)).toBe('sl-ug');
    });
  });

  describe('getProcessSegment', () => {
    // Pins the slash-handling contract behind `preview_path_preserve_slashes`
    // (DCMS-628): `getProcessSegment`'s `preserveSlashes` argument is what
    // `previewUrlFormatter` resolves from
    // `file/collection.preview_path_preserve_slashes ?? collection.nested`.
    const slugConfig = {
      encoding: 'unicode',
      clean_accents: false,
      sanitize_replacement: '-',
    };

    it('sanitizes an interior slash away when preserveSlashes is not set (non-nested default)', () => {
      const processSegment = getProcessSegment(slugConfig);
      expect(processSegment('nested/value')).toBe('nested-value');
    });

    it('preserves an interior slash when preserveSlashes is true (nested collection default)', () => {
      const processSegment = getProcessSegment(slugConfig, undefined, true);
      expect(processSegment('nested/value')).toBe('nested/value');
    });

    it('preserves an interior slash when preserveSlashes is explicitly true on a non-nested collection', () => {
      // Same call shape as previewUrlFormatter would make for
      // `preview_path_preserve_slashes: true` on a non-nested collection.
      const processSegment = getProcessSegment(slugConfig, [], true);
      expect(processSegment('nested/value')).toBe('nested/value');
    });
  });

  const slugConfig = {
    encoding: 'unicode',
    clean_accents: false,
    sanitize_replacement: '-',
  };

  describe('slugFormatter', () => {
    const date = new Date('2020-01-01').valueOf();
    Date.now = vi.spyOn(Date, 'now').mockImplementation(() => date);

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(selectIdentifier).mockReturnValue('title');
    });

    it('should format with default pattern', () => {
      vi.mocked(selectIdentifier).mockReturnValueOnce('title');
      expect(slugFormatter({}, { title: 'Post Title' }, slugConfig)).toBe('post-title');
    });

    it('should format with date', () => {
      vi.mocked(selectIdentifier).mockReturnValueOnce('title');

      expect(
        slugFormatter(
          { slug: '{{year}}-{{month}}-{{day}}_{{slug}}' },
          { title: 'Post Title' },
          slugConfig,
        ),
      ).toBe('2020-01-01_post-title');
    });

    it('should format with entry field', () => {
      vi.mocked(selectIdentifier).mockReturnValueOnce('slug');

      expect(
        slugFormatter(
          { slug: '{{fields.slug}}' },
          { title: 'Post Title', slug: 'entry-slug' },
          slugConfig,
        ),
      ).toBe('entry-slug');
    });

    it('should see date filters applied to date from entry if it exists', () => {
      vi.mocked(selectInferredField).mockReturnValue('date');
      const entryDate = new Date('2026-10-20');

      expect(
        slugFormatter(
          { slug: '{{year}}-{{month}}-{{day}}-{{title}}' },
          { date: entryDate, title: 'post title' },
          slugConfig,
        ),
      ).toBe('2026-10-20-post-title');
    });

    it('should see date filters applied to publishDate from entry if it exists', () => {
      vi.mocked(selectInferredField).mockReturnValue('publishDate');
      const entryDate = new Date('2026-10-20');

      expect(
        slugFormatter(
          { slug: '{{year}}-{{month}}-{{day}}-{{title}}' },
          { publishDate: entryDate, title: 'post title' },
          slugConfig,
        ),
      ).toBe('2026-10-20-post-title');
    });

    it('should return slug', () => {
      vi.mocked(selectIdentifier).mockReturnValueOnce('title');

      expect(slugFormatter({ slug: '{{slug}}' }, { title: 'Post Title' }, slugConfig)).toBe(
        'post-title',
      );
    });

    it('should return slug with path', () => {
      vi.mocked(selectIdentifier).mockReturnValueOnce('title');

      expect(
        slugFormatter(
          { slug: '{{year}}-{{month}}-{{day}}-{{slug}}', path: 'sub_dir/{{year}}/{{slug}}' },
          { title: 'Post Title' },
          slugConfig,
        ),
      ).toBe('sub_dir/2020/2020-01-01-post-title');
    });

    it('should only sanitize template variables', () => {
      vi.mocked(selectIdentifier).mockReturnValueOnce('title');

      expect(
        slugFormatter(
          {
            slug: '{{year}}-{{month}}-{{day}}-{{slug}}.en',
            path: 'sub_dir/{{year}}/{{slug}}',
          },
          { title: 'Post Title' },
          slugConfig,
        ),
      ).toBe('sub_dir/2020/2020-01-01-post-title.en');
    });

    it(`should replace '.' in path with -`, () => {
      vi.mocked(selectIdentifier).mockReturnValueOnce('title');

      expect(
        slugFormatter(
          {
            slug: '{{slug}}.en',
            path: '../dir/{{slug}}',
          },
          { title: 'Post Title' },
          slugConfig,
        ),
      ).toBe('--/dir/post-title.en');
    });
  });

  describe('previewUrlFormatter', () => {
    it('should return undefined when missing baseUrl', () => {
      expect(previewUrlFormatter('')).toBeUndefined();
    });

    it('should return baseUrl for collection with no preview_path', () => {
      expect(previewUrlFormatter('https://www.example.com', {})).toBe('https://www.example.com');
    });

    it('should return preview url based on preview_path and preview_path_date_field', () => {
      const date = new Date('2020-01-02T13:28:27.679Z');
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            preview_path: '{{year}}/{{slug}}/{{title}}/{{fields.slug}}',
            preview_path_date_field: 'customDateField',
          },
          'backendSlug',
          { data: { customDateField: date, slug: 'entrySlug', title: 'title' } },
          slugConfig,
        ),
      ).toBe('https://www.example.com/2020/backendslug/title/entryslug');
    });

    it('should return preview url for files in file collection', () => {
      const file = { name: 'about-file', preview_path: '{{slug}}/{{fields.slug}}/{{title}}' };

      vi.mocked(getFileFromSlug).mockReturnValue(file);

      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            preview_path: '{{slug}}/{{title}}/{{fields.slug}}',
            type: 'file_based_collection',
            files: [file],
          },
          'backendSlug',
          { data: { slug: 'about-the-project', title: 'title' }, slug: 'about-file' },
          slugConfig,
        ),
      ).toBe('https://www.example.com/backendslug/about-the-project/title');
    });

    it('should return preview url for files in file collection when defined on file-level only', () => {
      const file = { name: 'about-file', preview_path: '{{slug}}/{{fields.slug}}/{{title}}' };

      vi.mocked(getFileFromSlug).mockReturnValue(file);

      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            type: 'file_based_collection',
            files: [file],
          },
          'backendSlug',
          { data: { slug: 'about-the-project', title: 'title' }, slug: 'about-file' },
          slugConfig,
        ),
      ).toBe('https://www.example.com/backendslug/about-the-project/title');
    });

    it('should fall back to collection preview url for files in file collection', () => {
      const file = { name: 'about-file' };

      vi.mocked(getFileFromSlug).mockReturnValue(file);

      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            preview_path: '{{slug}}/{{title}}/{{fields.slug}}',
            type: 'file_based_collection',
            files: [file],
          },
          'backendSlug',
          { data: { slug: 'about-the-project', title: 'title' }, slug: 'about-file' },
          slugConfig,
        ),
      ).toBe('https://www.example.com/backendslug/title/about-the-project');
    });

    it('should infer date field when preview_path_date_field is not configured', () => {
      vi.mocked(selectInferredField).mockReturnValue('date');

      const date = new Date('2020-01-02T13:28:27.679Z');
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            name: 'posts',
            preview_path: '{{year}}/{{month}}/{{slug}}/{{title}}/{{fields.slug}}',
          },
          'backendSlug',
          { data: { date, slug: 'entrySlug', title: 'title' } },
          slugConfig,
        ),
      ).toBe('https://www.example.com/2020/01/backendslug/title/entryslug');
    });

    it('should compile filename and extension template values', () => {
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            preview_path: 'posts/{{filename}}.{{extension}}',
          },
          'backendSlug',
          { data: {}, path: 'src/content/posts/title.md' },
          slugConfig,
        ),
      ).toBe('https://www.example.com/posts/title.md');
    });

    it('should compile the dirname template value to empty in a regular collection', () => {
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            folder: '_portfolio',
            preview_path: 'portfolio/{{dirname}}',
          },
          'backendSlug',
          { data: {}, path: '_portfolio/i-am-the-slug.md' },
          slugConfig,
        ),
      ).toBe('https://www.example.com/portfolio/');
    });

    it('should compile dirname template value when in a nested collection', () => {
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            folder: '_portfolio',
            preview_path: 'portfolio/{{dirname}}',
            nested: { depth: 100 },
            meta: { path: { widget: 'string', label: 'Path', index_file: 'index' } },
          },
          'backendSlug',
          { data: {}, path: '_portfolio/drawing/i-am-the-slug/index.md' },
          slugConfig,
        ),
      ).toBe('https://www.example.com/portfolio/drawing/i-am-the-slug');
    });

    it('should log error and ignore preview_path when date is missing', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            name: 'posts',
            preview_path: '{{year}}',
            preview_path_date_field: 'date',
          },
          'backendSlug',
          { data: {} },
          slugConfig,
        ),
      ).toBe('https://www.example.com');

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        'Collection "posts" configuration error:\n  `preview_path_date_field` must be a field with a valid date. Ignoring `preview_path`.',
      );
    });

    it('should preserve slashes in value when configured', () => {
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            preview_path: 'prefix/{{value}}',
            preview_path_preserve_slashes: true,
          },
          'backendSlug',
          { data: { value: 'nested/value' } },
          slugConfig,
        ),
      ).toBe('https://www.example.com/prefix/nested/value');
    });

    it('should sanitize slashes in value when not configured', () => {
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            preview_path: 'prefix/{{value}}',
          },
          'backendSlug',
          { data: { value: 'nested/value' } },
          slugConfig,
        ),
      ).toBe('https://www.example.com/prefix/nested-value');
    });

    it('should preserve slashes in value for nested collections by default', () => {
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            preview_path: 'prefix/{{value}}',
            nested: { depth: 10 },
          },
          'backendSlug',
          { data: { value: 'nested/value' } },
          slugConfig,
        ),
      ).toBe('https://www.example.com/prefix/nested/value');
    });

    it('should sanitize slashes in value for nested collections when explicitly disabled', () => {
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            preview_path: 'prefix/{{value}}',
            nested: { depth: 10 },
            preview_path_preserve_slashes: false,
          },
          'backendSlug',
          { data: { value: 'nested/value' } },
          slugConfig,
        ),
      ).toBe('https://www.example.com/prefix/nested-value');
    });

    it('should always preserve slashes in {{dirname}} even when preview_path_preserve_slashes is explicitly disabled', () => {
      // Pins current behavior: `dirname` is passed into `getProcessSegment`'s
      // `ignoreValues`, which short-circuits before `preserveSlashes` is ever
      // consulted, so `preview_path_preserve_slashes: false` has no effect on
      // `{{dirname}}` specifically (see docs/core/preview-path.md).
      expect(
        previewUrlFormatter(
          'https://www.example.com',
          {
            folder: '_portfolio',
            preview_path: 'portfolio/{{dirname}}',
            nested: { depth: 100 },
            preview_path_preserve_slashes: false,
            meta: { path: { widget: 'string', label: 'Path', index_file: 'index' } },
          },
          'backendSlug',
          { data: {}, path: '_portfolio/drawing/i-am-the-slug/index.md' },
          slugConfig,
        ),
      ).toBe('https://www.example.com/portfolio/drawing/i-am-the-slug');
    });
  });

  describe('summaryFormatter', () => {
    it('should return summary from template', () => {
      vi.mocked(selectInferredField).mockReturnValue('date');

      const date = new Date('2020-01-02T13:28:27.679Z');
      const entry = { data: { date, title: 'title' } };
      const collection = { fields: [{ name: 'date', widget: 'date' }] };

      expect(summaryFormatter('{{title}}-{{year}}', entry, collection)).toBe('title-2020');
    });

    it('should handle filename and extension variables', () => {
      vi.mocked(selectInferredField).mockReturnValue('date');

      const date = new Date('2020-01-02T13:28:27.679Z');
      const entry = { path: 'post.md', data: { date, title: 'title' } };
      const collection = { fields: [{ name: 'date', widget: 'date' }] };

      expect(
        summaryFormatter('{{title}}-{{year}}-{{filename}}.{{extension}}', entry, collection),
      ).toBe('title-2020-post.md');
    });

    it('should handle the dirname variable in a regular collection', () => {
      vi.mocked(selectInferredField).mockReturnValue('date');

      const date = new Date('2020-01-02T13:28:27.679Z');
      const entry = {
        path: '_portfolio/drawing.md',
        data: { date, title: 'title' },
      };
      const collection = {
        folder: '_portfolio',
        fields: [{ name: 'date', widget: 'date' }],
      };

      expect(summaryFormatter('{{dirname}}/{{title}}-{{year}}', entry, collection)).toBe(
        '/title-2020',
      );
    });

    it('should handle the dirname variable in a nested collection', () => {
      vi.mocked(selectInferredField).mockReturnValue('date');

      const date = new Date('2020-01-02T13:28:27.679Z');
      const entry = {
        path: '_portfolio/drawing/index.md',
        data: { date, title: 'title' },
      };
      const collection = {
        folder: '_portfolio',
        nested: { depth: 100 },
        meta: { path: { widget: 'string', label: 'Path', index_file: 'index' } },
        fields: [{ name: 'date', widget: 'date' }],
      };

      expect(summaryFormatter('{{dirname}}/{{title}}-{{year}}', entry, collection)).toBe(
        'drawing/title-2020',
      );
    });
  });

  describe('folderFormatter', () => {
    it('should return folder is entry is undefined', () => {
      expect(folderFormatter('static/images', undefined)).toBe('static/images');
    });

    it('should return folder is entry data is undefined', () => {
      expect(folderFormatter('static/images', {})).toBe('static/images');
    });

    it('should return formatted folder', () => {
      vi.mocked(selectIdentifier).mockReturnValue('title');

      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { title: 'Deployment With NanoBox', category: 'Hosting And Deployment' },
      };
      const collection = {};

      expect(
        folderFormatter(
          '../../../{{media_folder}}/{{category}}/{{slug}}',
          entry,
          collection,
          'static/images',
          'media_folder',
          slugConfig,
        ),
      ).toBe('../../../static/images/hosting-and-deployment/deployment-with-nanobox');
    });

    it('should compile filename template value', () => {
      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { category: 'Hosting And Deployment' },
      };
      const collection = {};

      expect(
        folderFormatter(
          '../../../{{media_folder}}/{{category}}/{{filename}}',
          entry,
          collection,
          'static/images',
          'media_folder',
          slugConfig,
        ),
      ).toBe('../../../static/images/hosting-and-deployment/deployment-with-nanobox');
    });

    it('should compile extension template value', () => {
      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { category: 'Hosting And Deployment' },
      };
      const collection = {};

      expect(
        folderFormatter(
          '{{extension}}',
          entry,
          collection,
          'static/images',
          'media_folder',
          slugConfig,
        ),
      ).toBe('md');
    });

    it('should compile dirname template value in a regular collection', () => {
      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { category: 'Hosting And Deployment' },
      };
      const collection = {
        folder: 'content/en/',
      };

      expect(
        folderFormatter(
          '{{dirname}}',
          entry,
          collection,
          'static/images',
          'media_folder',
          slugConfig,
        ),
      ).toBe('hosting-and-deployment');
    });

    it('should compile dirname template value in a nested collection', () => {
      const entry = {
        path: '_portfolio/drawing/i-am-the-slug/index.md',
        data: { category: 'Hosting And Deployment' },
      };
      const collection = {
        folder: '_portfolio',
        nested: { depth: 100 },
        meta: { path: { widget: 'string', label: 'Path', index_file: 'index' } },
        fields: [{ name: 'date', widget: 'date' }],
      };

      expect(
        folderFormatter(
          '{{dirname}}',
          entry,
          collection,
          'static/images',
          'media_folder',
          slugConfig,
        ),
      ).toBe('drawing/i-am-the-slug');
    });
  });
});
