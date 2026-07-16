import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Backend,
  expandSearchEntries,
  extractSearchFields,
  mergeExpandedEntries,
  resolveBackend,
} from '@/core/backend';
import { FILES, FOLDER } from '@/core/constants/collectionTypes';
import { getBackend } from '@/core/lib/registry';
import { sanitizeChar, sanitizeSlug } from '@/core/lib/urlHelper';
import { asyncLock, localForage } from '@/lib/util/index';

vi.mock('../lib/registry');
vi.mock('../../lib/util/index', () => ({
  APIError: class APIError extends Error {
    status: number;
    api: string;
    constructor(message: string, status: number, api: string) {
      super(message);
      this.status = status;
      this.api = api;
      this.name = 'API_ERROR';
    }
  },
  AccessTokenError: class AccessTokenError extends Error {},
  ConfigurationError: class ConfigurationError extends Error {},
  CURSOR_COMPATIBILITY_SYMBOL: Symbol('cursor key for compatibility with old backends'),
  Cursor: class Cursor {
    static create = vi.fn(() => ({
      wrapData: vi.fn(function(this: unknown) {
        return this;
      }),
    }));
  },
  EditorialWorkflowError: class EditorialWorkflowError extends Error {
    notUnderEditorialWorkflow = false;
  },
  EDITORIAL_WORKFLOW_ERROR: 'EDITORIAL_WORKFLOW_ERROR',
  LocalSearchError: class LocalSearchError extends Error {
    errors: Error[];
    constructor(message: string, errors: Error[]) {
      super(message);
      this.errors = errors;
      this.name = 'LOCAL_SEARCH_ERROR';
    }
  },
  CmsSortDirection: {
    Ascending: 'Ascending',
    Descending: 'Descending',
    None: 'None',
  },
  localForage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    iterate: vi.fn(),
    key: vi.fn(),
    keys: vi.fn(),
    length: vi.fn(),
    config: vi.fn(),
    createInstance: vi.fn(),
    defineDriver: vi.fn(),
    driver: vi.fn(),
    dropInstance: vi.fn(),
    ready: vi.fn(),
    setDriver: vi.fn(),
  },
  isAbsolutePath: vi.fn((path: string) => path.startsWith('/')),
  basename: vi.fn((path: string, ext?: string) => {
    const base = path.split('/').pop() || '';
    return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
  }),
  fileExtensionWithSeparator: vi.fn((path: string) => {
    const i = path.lastIndexOf('.');
    return i >= 0 ? path.slice(i) : '';
  }),
  fileExtension: vi.fn((path: string) => {
    const i = path.lastIndexOf('.');
    return i >= 0 ? path.slice(i + 1) : '';
  }),
  extname: vi.fn((path: string) => {
    const i = path.lastIndexOf('.');
    return i >= 0 ? path.slice(i) : '';
  }),
  dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/') || '.'),
  join: vi.fn((...parts: string[]) => parts.join('/').replace(/\/+/g, '/')),
  onlySuccessfulPromises: vi.fn(),
  flowAsync: vi.fn(),
  promiseThen: vi.fn(),
  unsentRequest: {
    fetchWithTimeout: vi.fn(),
    performRequest: vi.fn(),
    withRoot: vi.fn(),
    withHeaders: vi.fn(),
    withBody: vi.fn(),
    withMethod: vi.fn(),
    withJSON: vi.fn(),
    withNoCache: vi.fn(),
    toFetchArguments: vi.fn(),
  },
  filterByExtension: vi.fn(),
  getAllResponses: vi.fn(),
  parseLinkHeader: vi.fn(),
  parseResponse: vi.fn(),
  responseParser: vi.fn(),
  getPathDepth: vi.fn(),
  loadScript: vi.fn(),
  getBlobSHA: vi.fn(),
  asyncLock: vi.fn(() => ({ acquire: vi.fn(), release: vi.fn() })),
  entriesByFiles: vi.fn(),
  entriesByFolder: vi.fn(),
  unpublishedEntries: vi.fn(),
  getMediaDisplayURL: vi.fn(),
  getMediaAsBlob: vi.fn(),
  runWithLock: vi.fn(),
  blobToFileObj: vi.fn(),
  allEntriesByFolder: vi.fn(),
  readFile: vi.fn(),
  readFileMetadata: vi.fn(),
  isPreviewContext: vi.fn(),
  getPreviewStatus: vi.fn(),
  PreviewState: { Success: 'success', Other: 'other' },
  requestWithBackoff: vi.fn(),
  getDefaultBranchName: vi.fn(),
  throwOnConflictingBranches: vi.fn(),
  CMS_BRANCH_PREFIX: 'cms/',
  generateContentKey: vi.fn(),
  isCMSLabel: vi.fn(),
  labelToStatus: vi.fn(),
  statusToLabel: vi.fn(),
  DEFAULT_PR_BODY: '',
  MERGE_COMMIT_MESSAGE: '',
  parseContentKey: vi.fn(),
  branchFromContentKey: vi.fn(),
  contentKeyFromBranch: vi.fn(),
  createPointerFile: vi.fn(),
  getLargeMediaFilteredMediaFiles: vi.fn(),
  getLargeMediaPatternsFromGitAttributesFile: vi.fn(),
  parsePointerFile: vi.fn(),
  getPointerFileForMediaFileObj: vi.fn(),
  isHotkey: vi.fn(),
  isCodeHotkey: vi.fn(),
  isKeyHotkey: vi.fn(),
}));
vi.mock('../lib/urlHelper');

describe('Backend', () => {
  describe('filterEntries', () => {
    let backend;

    beforeEach(() => {
      getBackend.mockReturnValue({
        init: vi.fn(),
      });
      backend = resolveBackend({
        backend: {
          name: 'git-gateway',
        },
      });
    });

    it('filters string values', () => {
      const result = backend.filterEntries(
        {
          entries: [
            {
              data: {
                testField: 'testValue',
              },
            },
            {
              data: {
                testField: 'testValue2',
              },
            },
          ],
        },
        { field: 'testField', value: 'testValue' },
      );

      expect(result.length).toBe(1);
    });

    it('filters number values', () => {
      const result = backend.filterEntries(
        {
          entries: [
            {
              data: {
                testField: 42,
              },
            },
            {
              data: {
                testField: 5,
              },
            },
          ],
        },
        { field: 'testField', value: 42 },
      );

      expect(result.length).toBe(1);
    });

    it('filters boolean values', () => {
      const result = backend.filterEntries(
        {
          entries: [
            {
              data: {
                testField: false,
              },
            },
            {
              data: {
                testField: true,
              },
            },
          ],
        },
        { field: 'testField', value: false },
      );

      expect(result.length).toBe(1);
    });

    it('filters list values', () => {
      const result = backend.filterEntries(
        {
          entries: [
            {
              data: {
                testField: ['valueOne', 'valueTwo', 'testValue'],
              },
            },
            {
              data: {
                testField: ['valueThree'],
              },
            },
          ],
        },
        { field: 'testField', value: 'testValue' },
      );

      expect(result.length).toBe(1);
    });
  });

  describe('resolveBackend', () => {
    beforeEach(() => {
      (getBackend as ReturnType<typeof vi.fn>).mockReset();
    });

    it('throws when config.backend.name is unset', () => {
      expect(() => resolveBackend({ backend: {} })).toThrowError(
        'No backend defined in configuration',
      );
    });

    it('throws with the generic registerBackend hint for an unregistered non-laika backend', () => {
      (getBackend as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      expect(() => resolveBackend({ backend: { name: 'some-unregistered-backend' } })).toThrowError(
        /Backend not found: some-unregistered-backend\..*Make sure the backend is registered with CMS\.registerBackend\(\) before/,
      );
    });

    it('throws with the laika-specific hint when config.backend.name is "laika" and unregistered', () => {
      (getBackend as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      expect(() => resolveBackend({ backend: { name: 'laika' } })).toThrowError(
        /Backend not found: laika\..*register it before init\(\) via CMS\.registerBackend\("laika", createLaikaBackend\(\)\).*@laikacms\/decap-cms\/backends\/laika/,
      );
    });
  });

  describe('getLocalDraftBackup', () => {
    (asyncLock as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      acquire: vi.fn(),
      release: vi.fn(),
    }));

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return empty object on no item', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = {
        name: 'posts',
      };
      const slug = 'slug';

      localForage.getItem.mockReturnValue();

      const result = await backend.getLocalDraftBackup(collection, slug);

      expect(result).toEqual({});
      expect(localForage.getItem).toHaveBeenCalledTimes(1);
      expect(localForage.getItem).toHaveBeenCalledWith('backup.posts.slug');
    });

    it('should return empty object on item with empty content', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
      };
      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = {
        name: 'posts',
      };
      const slug = 'slug';

      localForage.getItem.mockReturnValue({ raw: '' });

      const result = await backend.getLocalDraftBackup(collection, slug);

      expect(result).toEqual({});
      expect(localForage.getItem).toHaveBeenCalledTimes(1);
      expect(localForage.getItem).toHaveBeenCalledWith('backup.posts.slug');
    });

    it('should return backup entry, empty media files and assets when only raw property was saved', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = {
        name: 'posts',
      };
      const slug = 'slug';

      localForage.getItem.mockReturnValue({
        raw: '---\ntitle: "Hello World"\n---\n',
      });

      const result = await backend.getLocalDraftBackup(collection, slug);

      expect(result).toEqual({
        entry: {
          author: '',
          mediaFiles: [],
          collection: 'posts',
          slug: 'slug',
          path: '',
          partial: false,
          raw: '---\ntitle: "Hello World"\n---\n',
          data: { title: 'Hello World' },
          meta: {},
          i18n: {},
          label: null,
          isModification: null,
          status: '',
          updatedOn: '',
        },
      });
      expect(localForage.getItem).toHaveBeenCalledTimes(1);
      expect(localForage.getItem).toHaveBeenCalledWith('backup.posts.slug');
    });

    it('should return backup entry, media files and assets when all were backed up', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = {
        name: 'posts',
      };
      const slug = 'slug';

      localForage.getItem.mockReturnValue({
        raw: '---\ntitle: "Hello World"\n---\n',
        mediaFiles: [{ id: '1' }],
      });

      const result = await backend.getLocalDraftBackup(collection, slug);

      expect(result).toEqual({
        entry: {
          author: '',
          mediaFiles: [{ id: '1' }],
          collection: 'posts',
          slug: 'slug',
          path: '',
          partial: false,
          raw: '---\ntitle: "Hello World"\n---\n',
          data: { title: 'Hello World' },
          meta: {},
          i18n: {},
          label: null,
          isModification: null,
          status: '',
          updatedOn: '',
        },
      });
      expect(localForage.getItem).toHaveBeenCalledTimes(1);
      expect(localForage.getItem).toHaveBeenCalledWith('backup.posts.slug');
    });
  });

  describe('persistLocalDraftBackup', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should not persist empty entry', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      backend.entryToRaw = vi.fn().mockReturnValue('');

      const collection = {
        name: 'posts',
      };

      const slug = 'slug';

      const entry = {
        slug,
      };

      await backend.persistLocalDraftBackup(entry, collection);

      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      expect(backend.entryToRaw).toHaveBeenCalledWith(collection, entry);
      expect(localForage.setItem).toHaveBeenCalledTimes(0);
    });

    it('should persist non empty entry', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      backend.entryToRaw = vi.fn().mockReturnValue('content');

      const collection = {
        name: 'posts',
      };

      const slug = 'slug';

      const entry = {
        slug,
        path: 'content/posts/entry.md',
        mediaFiles: [{ id: '1' }],
      };

      await backend.persistLocalDraftBackup(entry, collection);

      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      expect(backend.entryToRaw).toHaveBeenCalledWith(collection, entry);
      expect(localForage.setItem).toHaveBeenCalledTimes(2);
      expect(localForage.setItem).toHaveBeenCalledWith('backup.posts.slug', {
        mediaFiles: [{ id: '1' }],
        path: 'content/posts/entry.md',
        raw: 'content',
      });
      expect(localForage.setItem).toHaveBeenCalledWith('backup', 'content');
    });
  });

  describe('persistEntry', () => {
    it('should update the draft with the new entry returned by preSave event', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
        persistEntry: vi.fn(() => implementation),
      };

      const config = {
        backend: {
          commit_messages: 'commit-messages',
        },
      };
      const collection = {
        name: 'posts',
      };
      const entry = {
        data: 'old_data',
      };
      const newEntry = {
        data: 'new_data',
      };
      const entryDraft = {
        entry,
      };
      const user = { login: 'login', name: 'name' };
      const backend = new Backend(implementation, { config, backendName: 'github' });

      backend.currentUser = vi.fn().mockResolvedValue(user);
      backend.entryToRaw = vi.fn().mockReturnValue('content');
      backend.invokePreSaveEvent = vi.fn().mockReturnValueOnce(newEntry);

      await backend.persistEntry({ config, collection, entryDraft });

      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      expect(backend.entryToRaw).toHaveBeenCalledWith(collection, newEntry);
    });

    it('should update the draft with the new data returned by preSave event', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
        persistEntry: vi.fn(() => implementation),
      };

      const config = {
        backend: {
          commit_messages: 'commit-messages',
        },
      };
      const collection = {
        name: 'posts',
      };
      const entry = {
        data: {},
      };
      const newData = {};
      const newEntry = {
        data: newData,
      };
      const entryDraft = {
        entry,
      };
      const user = { login: 'login', name: 'name' };
      const backend = new Backend(implementation, { config, backendName: 'github' });

      backend.currentUser = vi.fn().mockResolvedValue(user);
      backend.entryToRaw = vi.fn().mockReturnValue('content');
      backend.invokePreSaveEvent = vi.fn().mockReturnValueOnce(newData);

      await backend.persistEntry({ config, collection, entryDraft });

      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      expect(backend.entryToRaw).toHaveBeenCalledWith(collection, newEntry);
    });

    it('should preserve slug when preSave event handler modifies file collection entry', async () => {
      const implementation = {
        init: vi.fn(() => implementation),
        persistEntry: vi.fn(() => implementation),
      };

      const config = {
        backend: {
          commit_messages: 'commit-messages',
        },
      };

      const collection = {
        name: 'settings',
        type: FILES,
        files: [
          {
            name: 'config',
            file: 'data/config.json',
            fields: [{ name: 'title', widget: 'string' }],
          },
        ],
      };

      const originalEntry = {
        slug: 'config',
        path: 'data/config.json',
        data: { title: 'original' },
        meta: { path: 'data/config.json' },
      };

      const entryDraft = {
        entry: originalEntry,
      };

      const user = { login: 'login', name: 'name' };
      const backend = new Backend(implementation, { config, backendName: 'github' });

      backend.currentUser = vi.fn().mockResolvedValue(user);
      backend.entryToRaw = vi.fn().mockReturnValue('content');

      // Returning the FULL entry with slug — not just the data — is the
      // contract verified by registry.invokeEvent.
      backend.invokePreSaveEvent = vi.fn().mockImplementation(async entry => {
        return { ...entry, data: { ...entry.data, title: 'modified' } };
      });

      await backend.persistEntry({ config, collection, entryDraft });

      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      const entryPassedToRaw = backend.entryToRaw.mock.calls[0][1];

      expect(entryPassedToRaw.slug).toBe('config');
      expect(entryPassedToRaw.path).toBe('data/config.json');
      expect(entryPassedToRaw.data.title).toBe('modified');
    });
  });

  describe('persistMedia', () => {
    it('should persist media', async () => {
      const persistMediaResult = {};
      const implementation = {
        init: vi.fn(() => implementation),
        persistMedia: vi.fn().mockResolvedValue(persistMediaResult),
      };
      const config = { backend: { name: 'github' } };

      const backend = new Backend(implementation, { config, backendName: config.backend.name });
      const user = { login: 'login', name: 'name' };
      backend.currentUser = vi.fn().mockResolvedValue(user);

      const file = { path: 'static/media/image.png' };

      const result = await backend.persistMedia(config, file);
      expect(result).toBe(persistMediaResult);
      expect(implementation.persistMedia).toHaveBeenCalledTimes(1);
      expect(implementation.persistMedia).toHaveBeenCalledWith(
        { path: 'static/media/image.png' },
        { commitMessage: 'Upload "static/media/image.png"' },
      );
    });
  });

  describe('unpublishedEntry', () => {
    it('should return unpublished entry', async () => {
      const unpublishedEntryResult = {
        diffs: [{ path: 'src/posts/index.md', newFile: false }, { path: 'netlify.png' }],
      };
      const implementation = {
        init: vi.fn(() => implementation),
        unpublishedEntry: vi.fn().mockResolvedValue(unpublishedEntryResult),
        unpublishedEntryDataFile: vi.fn().mockResolvedValueOnce('---\ntitle: "Hello World"\n---\n'),
        unpublishedEntryMediaFile: vi.fn().mockResolvedValueOnce({ id: '1' }),
      };
      const config = {
        media_folder: 'static/images',
      };

      const backend = new Backend(implementation, { config, backendName: 'github' });

      const collection = {
        name: 'posts',
        folder: 'src/posts',
        fields: [],
      };

      const state = {
        config,
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: {},
      };

      const slug = 'slug';

      const result = await backend.unpublishedEntry(state, collection, slug);
      expect(result).toEqual({
        author: '',
        collection: 'posts',
        slug: '',
        path: 'src/posts/index.md',
        partial: false,
        raw: '---\ntitle: "Hello World"\n---\n',
        data: { title: 'Hello World' },
        meta: { path: 'src/posts/index.md' },
        i18n: {},
        label: null,
        isModification: true,
        mediaFiles: [{ id: '1', draft: true }],
        status: '',
        updatedOn: '',
      });
    });
  });

  describe('generateUniqueSlug', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("should return unique slug when entry doesn't exist", async () => {
      (sanitizeSlug as ReturnType<typeof vi.fn>).mockReturnValue('some-post-title');

      const implementation = {
        init: vi.fn(() => implementation),
        getEntry: vi.fn(() => Promise.resolve()),
      };

      const collection = {
        name: 'posts',
        fields: [
          {
            name: 'title',
          },
        ],
        type: FOLDER,
        folder: 'posts',
        slug: '{{slug}}',
        path: 'sub_dir/{{slug}}',
      };

      const entry = {
        title: 'some post title',
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      await expect(backend.generateUniqueSlug(collection, entry, {}, [])).resolves.toBe(
        'sub_dir/some-post-title',
      );
    });

    it('should return unique slug when entry exists', async () => {
      (sanitizeSlug as ReturnType<typeof vi.fn>).mockReturnValue('some-post-title');
      (sanitizeChar as ReturnType<typeof vi.fn>).mockReturnValue('-');

      const implementation = {
        init: vi.fn(() => implementation),
        getEntry: vi.fn(),
      };

      implementation.getEntry.mockResolvedValueOnce({ data: 'data' });
      implementation.getEntry.mockResolvedValueOnce();

      const collection = {
        name: 'posts',
        fields: [
          {
            name: 'title',
          },
        ],
        type: FOLDER,
        folder: 'posts',
        slug: '{{slug}}',
        path: 'sub_dir/{{slug}}',
      };

      const entry = {
        title: 'some post title',
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      await expect(backend.generateUniqueSlug(collection, entry, {}, [])).resolves.toBe(
        'sub_dir/some-post-title-1',
      );
    });
  });

  describe('extractSearchFields', () => {
    it('should extract slug', () => {
      expect(extractSearchFields(['slug'])({ slug: 'entry-slug', data: {} })).toEqual(
        ' entry-slug',
      );
    });

    it('should extract path', () => {
      expect(extractSearchFields(['path'])({ path: 'entry-path', data: {} })).toEqual(
        ' entry-path',
      );
    });

    it('should extract fields', () => {
      expect(
        extractSearchFields(['title', 'order'])({ data: { title: 'Entry Title', order: 5 } }),
      ).toEqual(' Entry Title 5');
    });

    it('should extract nested fields', () => {
      expect(
        extractSearchFields(['nested.title'])({ data: { nested: { title: 'nested title' } } }),
      ).toEqual(' nested title');
    });
  });

  describe('search/query', () => {
    const collections = [
      {
        name: 'posts',
        folder: 'posts',
        fields: [
          { name: 'title', widget: 'string' },
          { name: 'short_title', widget: 'string' },
          { name: 'author', widget: 'string' },
          { name: 'description', widget: 'string' },
          { name: 'nested', widget: 'object', fields: { name: 'title', widget: 'string' } },
        ],
      },
      {
        name: 'pages',
        folder: 'pages',
        fields: [
          { name: 'title', widget: 'string' },
          { name: 'short_title', widget: 'string' },
          { name: 'author', widget: 'string' },
          { name: 'description', widget: 'string' },
          { name: 'nested', widget: 'object', fields: { name: 'title', widget: 'string' } },
        ],
      },
    ];

    const posts = [
      {
        path: 'posts/find-me.md',
        slug: 'find-me',
        data: {
          title: 'find me by title',
          short_title: 'find me by short title',
          author: 'find me by author',
          description: 'find me by description',
          nested: { title: 'find me by nested title' },
        },
      },
      { path: 'posts/not-me.md', slug: 'not-me', data: { title: 'not me' } },
    ];

    const pages = [
      {
        path: 'pages/find-me.md',
        slug: 'find-me',
        data: {
          title: 'find me by title',
          short_title: 'find me by short title',
          author: 'find me by author',
          description: 'find me by description',
          nested: { title: 'find me by nested title' },
        },
      },
      { path: 'pages/not-me.md', slug: 'not-me', data: { title: 'not me' } },
    ];

    const files = [
      {
        path: 'files/file1.md',
        slug: 'file1',
        data: {
          author: 'find me by author',
        },
      },
      {
        path: 'files/file2.md',
        slug: 'file2',
        data: {
          other: 'find me by other',
        },
      },
    ];

    const implementation = {
      init: vi.fn(() => implementation),
    };

    let backend;
    beforeEach(() => {
      backend = new Backend(implementation, { config: {}, backendName: 'github' });
      backend.listAllEntries = vi.fn(collection => {
        if (collection.name === 'posts') {
          return Promise.resolve(posts);
        }
        if (collection.name === 'pages') {
          return Promise.resolve(pages);
        }
        if (collection.name === 'files') {
          return Promise.resolve(files);
        }
        return Promise.resolve([]);
      });
    });

    it('should search collections by title', async () => {
      const results = await backend.search(collections, 'find me by title');

      expect(results).toEqual({
        entries: [posts[0], pages[0]],
      });
    });

    it('should search collections by short title', async () => {
      const results = await backend.search(collections, 'find me by short title');

      expect(results).toEqual({
        entries: [posts[0], pages[0]],
      });
    });

    it('should search collections by author', async () => {
      const results = await backend.search(collections, 'find me by author');

      expect(results).toEqual({
        entries: [posts[0], pages[0]],
      });
    });

    it('should search collections by summary description', async () => {
      const results = await backend.search(
        collections.map(c => ({ ...c, summary: '{{description}}' })),
        'find me by description',
      );

      expect(results).toEqual({
        entries: [posts[0], pages[0]],
      });
    });

    it('should search in file collection using top level fields', async () => {
      const collections = [
        {
          name: 'files',
          files: [
            {
              name: 'file1',
              fields: [{ name: 'author', widget: 'string' }],
            },
            {
              name: 'file2',
              fields: [{ name: 'other', widget: 'string' }],
            },
          ],
          type: FILES,
        },
      ];

      expect(await backend.search(collections, 'find me by author')).toEqual({
        entries: [files[0]],
      });
      expect(await backend.search(collections, 'find me by other')).toEqual({
        entries: [files[1]],
      });
    });

    it('should reject with a readable error when a collection fails to load entries', async () => {
      const loadError = new Error('failed to load pages entries');
      backend.listAllEntries = vi.fn(collection => {
        if (collection.name === 'posts') {
          return Promise.resolve(posts);
        }
        if (collection.name === 'pages') {
          return Promise.reject(loadError);
        }
        return Promise.resolve([]);
      });

      await expect(backend.search(collections, 'find me by title')).rejects.toMatchObject({
        message: expect.stringContaining('failed to load pages entries'),
        errors: [loadError],
      });
    });

    it('should query collections by title', async () => {
      const results = await backend.query(collections[0], ['title'], 'find me by title');

      expect(results).toEqual({
        hits: [posts[0]],
        query: 'find me by title',
      });
    });

    it('should query collections by slug', async () => {
      const results = await backend.query(collections[0], ['slug'], 'find-me');

      expect(results).toEqual({
        hits: [posts[0]],
        query: 'find-me',
      });
    });

    it('should query collections by path', async () => {
      const results = await backend.query(collections[0], ['path'], 'posts/find-me.md');

      expect(results).toEqual({
        hits: [posts[0]],
        query: 'posts/find-me.md',
      });
    });

    it('should query collections by nested field', async () => {
      const results = await backend.query(
        collections[0],
        ['nested.title'],
        'find me by nested title',
      );

      expect(results).toEqual({
        hits: [posts[0]],
        query: 'find me by nested title',
      });
    });
  });

  describe('expandSearchEntries', () => {
    it('should expand entry with list to multiple entries', () => {
      const entry = {
        data: {
          field: {
            nested: {
              list: [
                { id: 1, name: '1' },
                { id: 2, name: '2' },
              ],
            },
          },
          list: [1, 2],
        },
      };

      expect(expandSearchEntries([entry], ['list.*', 'field.nested.list.*.name'])).toEqual([
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'list.0',
        },
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'list.1',
        },
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'field.nested.list.0.name',
        },
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'field.nested.list.1.name',
        },
      ]);
    });
  });

  describe('mergeExpandedEntries', () => {
    it('should merge entries and filter data', () => {
      const expanded = [
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                  { id: 3, name: '3' },
                  { id: 4, name: '4' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'field.nested.list.0.name',
        },
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                  { id: 3, name: '3' },
                  { id: 4, name: '4' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'field.nested.list.3.name',
        },
      ];

      expect(mergeExpandedEntries(expanded)).toEqual([
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 4, name: '4' },
                ],
              },
            },
            list: [1, 2],
          },
        },
      ]);
    });

    it('should merge entries and filter data based on different fields', () => {
      const expanded = [
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                  { id: 3, name: '3' },
                  { id: 4, name: '4' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'field.nested.list.0.name',
        },
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                  { id: 3, name: '3' },
                  { id: 4, name: '4' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'field.nested.list.3.name',
        },
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 2, name: '2' },
                  { id: 3, name: '3' },
                  { id: 4, name: '4' },
                ],
              },
            },
            list: [1, 2],
          },
          field: 'list.1',
        },
      ];

      expect(mergeExpandedEntries(expanded)).toEqual([
        {
          data: {
            field: {
              nested: {
                list: [
                  { id: 1, name: '1' },
                  { id: 4, name: '4' },
                ],
              },
            },
            list: [2],
          },
        },
      ]);
    });

    it('should merge entries and keep sort by entry index', () => {
      const expanded = [
        {
          data: {
            list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          },
          field: 'list.5',
        },
        {
          data: {
            list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          },
          field: 'list.0',
        },
        {
          data: {
            list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          },
          field: 'list.11',
        },
        {
          data: {
            list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          },
          field: 'list.1',
        },
      ];

      expect(mergeExpandedEntries(expanded)).toEqual([
        {
          data: {
            list: [5, 0, 11, 1],
          },
        },
      ]);
    });
  });
});
