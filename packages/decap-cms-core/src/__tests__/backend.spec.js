import { Map, List, fromJS } from 'immutable';

import {
  resolveBackend,
  Backend,
  extractSearchFields,
  expandSearchEntries,
  mergeExpandedEntries,
  slugFromCustomPath,
} from '../backend';
import { getBackend } from '../lib/registry';
import { FOLDER, FILES } from '../constants/collectionTypes';

jest.mock('../lib/registry');
jest.mock('decap-cms-lib-util');
jest.mock('../lib/urlHelper');

describe('Backend', () => {
  describe('filterEntries', () => {
    let backend;

    beforeEach(() => {
      getBackend.mockReturnValue({
        init: jest.fn(),
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
        Map({ field: 'testField', value: 'testValue' }),
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
        Map({ field: 'testField', value: 42 }),
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
        Map({ field: 'testField', value: false }),
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
        Map({ field: 'testField', value: 'testValue' }),
      );

      expect(result.length).toBe(1);
    });
  });

  describe('resolveBackend', () => {
    beforeEach(() => {
      getBackend.mockReset();
    });

    it('throws when config.backend.name is unset', () => {
      expect(() => resolveBackend({ backend: {} })).toThrowError(
        'No backend defined in configuration',
      );
    });

    it('throws with the generic registerBackend hint for an unregistered non-laika backend', () => {
      getBackend.mockReturnValue(undefined);

      expect(() => resolveBackend({ backend: { name: 'some-unregistered-backend' } })).toThrowError(
        /Backend not found: some-unregistered-backend\..*Make sure the backend is registered with CMS\.registerBackend\(\) before/,
      );
    });

    it('throws with the laika-specific hint when config.backend.name is "laika" and unregistered', () => {
      getBackend.mockReturnValue(undefined);

      expect(() => resolveBackend({ backend: { name: 'laika' } })).toThrowError(
        /Backend not found: laika\..*install @laikacms\/decap and.*register it before init\(\) via CMS\.registerBackend\("laika"/,
      );
    });
  });

  describe('currentBackend', () => {
    it('returns the identical Backend instance on a second call even with a different config', () => {
      jest.isolateModules(() => {
        const { currentBackend } = require('../backend');
        const { getBackend: mockedGetBackend } = require('../lib/registry');

        mockedGetBackend.mockReturnValue({ init: jest.fn() });

        const firstInstance = currentBackend({ backend: { name: 'git-gateway' } });
        const secondInstance = currentBackend({ backend: { name: 'some-other-backend' } });

        expect(secondInstance).toBe(firstInstance);
      });
    });
  });

  describe('currentUser', () => {
    // DCMS-439: a backend's restoreUser() resolving to undefined/null (test-repo,
    // backend-proxy) must not wipe out the rest of the stored user object.
    function makeBackendWithStoredUser(stored, restoreUserResult) {
      const implementation = {
        init: jest.fn(() => implementation),
        restoreUser: jest.fn().mockResolvedValue(restoreUserResult),
      };

      const authStore = {
        retrieve: jest.fn().mockReturnValue(stored),
        store: jest.fn(),
      };

      const backend = new Backend(implementation, {
        config: {},
        backendName: stored.backendName,
        authStore,
      });

      return { backend, authStore, implementation };
    }

    it('preserves stored fields when restoreUser() resolves undefined', async () => {
      const stored = { backendName: 'test-repo', name: 'Alice', login: 'alice' };
      const { backend, authStore } = makeBackendWithStoredUser(stored, undefined);

      const user = await backend.currentUser();

      expect(user).toEqual(stored);
      expect(authStore.store).toHaveBeenCalledWith(stored);
    });

    it('preserves stored fields when restoreUser() resolves null', async () => {
      const stored = { backendName: 'test-repo', name: 'Alice', login: 'alice' };
      const { backend } = makeBackendWithStoredUser(stored, null);

      const user = await backend.currentUser();

      expect(user).toEqual(stored);
    });

    it('lets fields returned by restoreUser() override the stored equivalents', async () => {
      const stored = { backendName: 'github', name: 'Alice', login: 'alice' };
      const { backend } = makeBackendWithStoredUser(stored, { name: 'Alice Updated' });

      const user = await backend.currentUser();

      expect(user).toEqual({ backendName: 'github', name: 'Alice Updated', login: 'alice' });
    });

    it('returns null when nothing is stored', async () => {
      const implementation = { init: jest.fn(() => implementation) };
      const authStore = { retrieve: jest.fn().mockReturnValue(undefined), store: jest.fn() };
      const backend = new Backend(implementation, {
        config: {},
        backendName: 'github',
        authStore,
      });

      await expect(backend.currentUser()).resolves.toBeNull();
    });
  });

  describe('getLocalDraftBackup', () => {
    const { localForage, asyncLock } = require('decap-cms-lib-util');

    asyncLock.mockImplementation(() => ({ acquire: jest.fn(), release: jest.fn() }));

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return empty object on no item', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = Map({
        name: 'posts',
      });
      const slug = 'slug';

      localForage.getItem.mockReturnValue();

      const result = await backend.getLocalDraftBackup(collection, slug);

      expect(result).toEqual({});
      expect(localForage.getItem).toHaveBeenCalledTimes(1);
      expect(localForage.getItem).toHaveBeenCalledWith('backup.posts.slug');
    });

    it('should return empty object on item with empty content', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
      };
      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = Map({
        name: 'posts',
      });
      const slug = 'slug';

      localForage.getItem.mockReturnValue({ raw: '' });

      const result = await backend.getLocalDraftBackup(collection, slug);

      expect(result).toEqual({});
      expect(localForage.getItem).toHaveBeenCalledTimes(1);
      expect(localForage.getItem).toHaveBeenCalledWith('backup.posts.slug');
    });

    it('should return backup entry, empty media files and assets when only raw property was saved', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = Map({
        name: 'posts',
      });
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
        init: jest.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = Map({
        name: 'posts',
      });
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

    it('should not throw and should omit the url when a persisted media file has a truthy, non-Blob file property', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      const collection = Map({
        name: 'posts',
      });
      const slug = 'slug';

      localForage.getItem.mockReturnValue({
        raw: '---\ntitle: "Hello World"\n---\n',
        mediaFiles: [{ id: '1', file: { notABlob: true } }],
      });

      const result = await backend.getLocalDraftBackup(collection, slug);

      expect(result).toEqual({
        entry: {
          author: '',
          mediaFiles: [{ id: '1', file: { notABlob: true } }],
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
      expect(result.entry.mediaFiles[0].url).toBeUndefined();
      expect(localForage.getItem).toHaveBeenCalledTimes(1);
      expect(localForage.getItem).toHaveBeenCalledWith('backup.posts.slug');
    });
  });

  describe('persistLocalDraftBackup', () => {
    const { localForage } = require('decap-cms-lib-util');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not persist empty entry', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      backend.entryToRaw = jest.fn().mockReturnValue('');

      const collection = Map({
        name: 'posts',
      });

      const slug = 'slug';

      const entry = Map({
        slug,
      });

      await backend.persistLocalDraftBackup(entry, collection);

      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      expect(backend.entryToRaw).toHaveBeenCalledWith(collection, entry);
      expect(localForage.setItem).toHaveBeenCalledTimes(0);
    });

    it('should persist non empty entry', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
      };

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      backend.entryToRaw = jest.fn().mockReturnValue('content');

      const collection = Map({
        name: 'posts',
      });

      const slug = 'slug';

      const entry = Map({
        slug,
        path: 'content/posts/entry.md',
        mediaFiles: List([{ id: '1' }]),
      });

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
        init: jest.fn(() => implementation),
        persistEntry: jest.fn(() => implementation),
      };

      const config = {
        backend: {
          commit_messages: 'commit-messages',
        },
      };
      const collection = Map({
        name: 'posts',
      });
      const entry = Map({
        data: 'old_data',
      });
      const newEntry = Map({
        data: 'new_data',
      });
      const entryDraft = Map({
        entry,
      });
      const user = { login: 'login', name: 'name' };
      const backend = new Backend(implementation, { config, backendName: 'github' });

      backend.currentUser = jest.fn().mockResolvedValue(user);
      backend.entryToRaw = jest.fn().mockReturnValue('content');
      backend.invokePreSaveEvent = jest.fn().mockReturnValueOnce(newEntry);

      await backend.persistEntry({ config, collection, entryDraft });

      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      expect(backend.entryToRaw).toHaveBeenCalledWith(collection, newEntry);
    });

    it('should update the draft with the new data returned by preSave event', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
        persistEntry: jest.fn(() => implementation),
      };

      const config = {
        backend: {
          commit_messages: 'commit-messages',
        },
      };
      const collection = Map({
        name: 'posts',
      });
      const entry = Map({
        data: Map({}),
      });
      const newData = Map({});
      const newEntry = Map({
        data: newData,
      });
      const entryDraft = Map({
        entry,
      });
      const user = { login: 'login', name: 'name' };
      const backend = new Backend(implementation, { config, backendName: 'github' });

      backend.currentUser = jest.fn().mockResolvedValue(user);
      backend.entryToRaw = jest.fn().mockReturnValue('content');
      backend.invokePreSaveEvent = jest.fn().mockReturnValueOnce(newData);

      await backend.persistEntry({ config, collection, entryDraft });

      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      expect(backend.entryToRaw).toHaveBeenCalledWith(collection, newEntry);
    });

    it('should preserve slug when preSave event handler modifies file collection entry', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
        persistEntry: jest.fn(() => implementation),
      };

      const config = {
        backend: {
          commit_messages: 'commit-messages',
        },
      };

      // File collection with a single file
      const collection = Map({
        name: 'settings',
        type: FILES,
        files: List([
          Map({
            name: 'config',
            file: 'data/config.json',
            fields: List([Map({ name: 'title', widget: 'string' })]),
          }),
        ]),
      });

      const originalEntry = Map({
        slug: 'config',
        path: 'data/config.json',
        data: Map({ title: 'original' }),
        meta: Map({ path: 'data/config.json' }),
      });

      const entryDraft = Map({
        entry: originalEntry,
      });

      const user = { login: 'login', name: 'name' };
      const backend = new Backend(implementation, { config, backendName: 'github' });

      backend.currentUser = jest.fn().mockResolvedValue(user);
      backend.entryToRaw = jest.fn().mockReturnValue('content');

      // Mock invokePreSaveEvent to simulate a preSave handler that modifies data
      // This is what happens when custom widgets or event handlers modify entry data
      // The key is that it returns the FULL entry with slug, not just the data
      backend.invokePreSaveEvent = jest.fn().mockImplementation(async entry => {
        // Simulate a preSave handler modifying the data field
        return entry.setIn(['data', 'title'], 'modified');
      });

      await backend.persistEntry({ config, collection, entryDraft });

      // Verify entryToRaw was called with an entry that has the slug
      expect(backend.entryToRaw).toHaveBeenCalledTimes(1);
      const entryPassedToRaw = backend.entryToRaw.mock.calls[0][1];

      // Critical assertion: slug must be preserved
      expect(entryPassedToRaw.get('slug')).toBe('config');
      expect(entryPassedToRaw.get('path')).toBe('data/config.json');
      expect(entryPassedToRaw.getIn(['data', 'title'])).toBe('modified');
    });
  });

  describe('persistMedia', () => {
    it('should persist media', async () => {
      const persistMediaResult = {};
      const implementation = {
        init: jest.fn(() => implementation),
        persistMedia: jest.fn().mockResolvedValue(persistMediaResult),
      };
      const config = { backend: { name: 'github' } };

      const backend = new Backend(implementation, { config, backendName: config.backend.name });
      const user = { login: 'login', name: 'name' };
      backend.currentUser = jest.fn().mockResolvedValue(user);

      const file = { path: 'static/media/image.png' };

      const result = await backend.persistMedia(config, file);
      expect(result).toBe(persistMediaResult);
      expect(implementation.persistMedia).toHaveBeenCalledTimes(1);
      expect(implementation.persistMedia).toHaveBeenCalledWith(
        { path: 'static/media/image.png' },
        { commitMessage: 'Upload “static/media/image.png”' },
      );
    });
  });

  describe('unpublishedEntry', () => {
    it('should return unpublished entry', async () => {
      const unpublishedEntryResult = {
        diffs: [{ path: 'src/posts/index.md', newFile: false }, { path: 'netlify.png' }],
      };
      const implementation = {
        init: jest.fn(() => implementation),
        unpublishedEntry: jest.fn().mockResolvedValue(unpublishedEntryResult),
        unpublishedEntryDataFile: jest
          .fn()
          .mockResolvedValueOnce('---\ntitle: "Hello World"\n---\n'),
        unpublishedEntryMediaFile: jest.fn().mockResolvedValueOnce({ id: '1' }),
      };
      const config = {
        media_folder: 'static/images',
      };

      const backend = new Backend(implementation, { config, backendName: 'github' });

      const collection = fromJS({
        name: 'posts',
        folder: 'src/posts',
        fields: [],
      });

      const state = {
        config,
        integrations: Map({}),
        mediaLibrary: Map({}),
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
      jest.resetAllMocks();
    });

    it("should return unique slug when entry doesn't exist", async () => {
      const { sanitizeSlug } = require('../lib/urlHelper');
      sanitizeSlug.mockReturnValue('some-post-title');

      const implementation = {
        init: jest.fn(() => implementation),
        getEntry: jest.fn(() => Promise.resolve()),
      };

      const collection = fromJS({
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
      });

      const entry = Map({
        title: 'some post title',
      });

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      await expect(backend.generateUniqueSlug(collection, entry, Map({}), [])).resolves.toBe(
        'sub_dir/some-post-title',
      );
    });

    it('should return unique slug when entry exists', async () => {
      const { sanitizeSlug, sanitizeChar } = require('../lib/urlHelper');
      sanitizeSlug.mockReturnValue('some-post-title');
      sanitizeChar.mockReturnValue('-');

      const implementation = {
        init: jest.fn(() => implementation),
        getEntry: jest.fn(),
      };

      implementation.getEntry.mockResolvedValueOnce({ data: 'data' });
      implementation.getEntry.mockResolvedValueOnce();

      const collection = fromJS({
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
      });

      const entry = Map({
        title: 'some post title',
      });

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      await expect(backend.generateUniqueSlug(collection, entry, Map({}), [])).resolves.toBe(
        'sub_dir/some-post-title-1',
      );
    });

    // DCMS-395: exercise the REAL (unmocked) `urlHelper` so an unset
    // `sanitize_replacement` genuinely falls back to '-' (matching the docs)
    // instead of being masked by a hard-coded `sanitizeChar` mock.
    it('should return a hyphen-separated unique slug using the real urlHelper default when sanitize_replacement is unset', async () => {
      const urlHelper = require('../lib/urlHelper');
      const actualUrlHelper = jest.requireActual('../lib/urlHelper');
      urlHelper.sanitizeSlug.mockImplementation(actualUrlHelper.sanitizeSlug);
      urlHelper.sanitizeChar.mockImplementation(actualUrlHelper.sanitizeChar);

      const implementation = {
        init: jest.fn(() => implementation),
        getEntry: jest.fn(),
      };

      implementation.getEntry.mockResolvedValueOnce({ data: 'data' });
      implementation.getEntry.mockResolvedValueOnce();

      const collection = fromJS({
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
      });

      const entry = Map({
        title: 'some post title',
      });

      // `config: {}` leaves `config.slug` (and therefore `sanitize_replacement`) unset.
      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      await expect(backend.generateUniqueSlug(collection, entry, Map({}), [])).resolves.toBe(
        'sub_dir/some-post-title-1',
      );
    });
  });

  // DCMS-514: an unknown slug in a files collection used to reach `getEntry` with
  // an `undefined` path (silently cast `as string`), crashing deep in path parsing
  // with a raw TypeError instead of a clean not-found error.
  describe('getEntry', () => {
    it('throws a clean not-found error for an unknown files-collection slug', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
        getEntry: jest.fn(),
      };

      const collection = fromJS({
        name: 'settings',
        type: FILES,
        files: [
          {
            name: 'general',
            file: 'data/general.json',
            fields: [{ name: 'title' }],
          },
        ],
      });

      const backend = new Backend(implementation, { config: {}, backendName: 'github' });

      await expect(backend.getEntry({}, collection, 'unknown-slug')).rejects.toThrow(
        'Entry not found: settings/unknown-slug',
      );
      expect(implementation.getEntry).not.toHaveBeenCalled();
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
      fromJS({
        name: 'posts',
        folder: 'posts',
        fields: [
          { name: 'title', widget: 'string' },
          { name: 'short_title', widget: 'string' },
          { name: 'author', widget: 'string' },
          { name: 'description', widget: 'string' },
          { name: 'nested', widget: 'object', fields: { name: 'title', widget: 'string' } },
        ],
      }),
      fromJS({
        name: 'pages',
        folder: 'pages',
        fields: [
          { name: 'title', widget: 'string' },
          { name: 'short_title', widget: 'string' },
          { name: 'author', widget: 'string' },
          { name: 'description', widget: 'string' },
          { name: 'nested', widget: 'object', fields: { name: 'title', widget: 'string' } },
        ],
      }),
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
      init: jest.fn(() => implementation),
    };

    let backend;
    beforeEach(() => {
      backend = new Backend(implementation, { config: {}, backendName: 'github' });
      backend.listAllEntries = jest.fn(collection => {
        if (collection.get('name') === 'posts') {
          return Promise.resolve(posts);
        }
        if (collection.get('name') === 'pages') {
          return Promise.resolve(pages);
        }
        if (collection.get('name') === 'files') {
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
        collections.map(c => c.set('summary', '{{description}}')),
        'find me by description',
      );

      expect(results).toEqual({
        entries: [posts[0], pages[0]],
      });
    });

    it('should search in file collection using top level fields', async () => {
      const collections = [
        fromJS({
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
        }),
      ];

      expect(await backend.search(collections, 'find me by author')).toEqual({
        entries: [files[0]],
      });
      expect(await backend.search(collections, 'find me by other')).toEqual({
        entries: [files[1]],
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

    it('should throw an Error with a string message and attach errors when a per-collection backend rejects', async () => {
      const backendError = new Error('listAllEntries failed');
      backend.listAllEntries = jest.fn().mockRejectedValue(backendError);

      let caught;
      try {
        await backend.search(collections, 'find me');
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(Error);
      expect(typeof caught.message).toBe('string');
      expect(caught.message).toBe('Errors occurred while searching entries locally!');
      expect(caught.errors).toEqual([backendError, backendError]);
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

  describe('persistEntry with nested collections', () => {
    it('should pass hasSubfolders=true when subfolders is true (default)', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
        persistEntry: jest.fn(),
      };

      const config = {
        backend: { commit_messages: {} },
      };
      const collection = Map({
        name: 'pages',
        type: FOLDER,
        folder: '_pages',
        create: true,
        fields: List([Map({ name: 'title', widget: 'string' })]),
        nested: Map({ depth: 10, subfolders: true }),
        meta: Map({ path: Map({ label: 'Path', widget: 'string' }) }),
      });
      const entryDraft = Map({
        entry: Map({
          data: Map({ title: 'Test' }),
          meta: Map({ path: 'blog' }),
          newRecord: true,
        }),
      });
      const user = { login: 'user', name: 'User' };
      const backend = new Backend(implementation, { config, backendName: 'test' });

      backend.currentUser = jest.fn().mockResolvedValue(user);
      backend.entryToRaw = jest.fn().mockReturnValue('content');
      backend.generateUniqueSlug = jest.fn().mockResolvedValue('test-slug');
      backend.invokePreSaveEvent = jest.fn().mockResolvedValue(entryDraft.get('entry'));
      backend.invokePostSaveEvent = jest.fn().mockResolvedValue();

      await backend.persistEntry({
        config,
        collection,
        entryDraft,
        assetProxies: [],
        usedSlugs: List(),
      });

      expect(implementation.persistEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          hasSubfolders: true,
        }),
      );
    });

    it('should pass hasSubfolders=false when subfolders is false', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
        persistEntry: jest.fn(),
      };

      const config = {
        backend: { commit_messages: {} },
      };
      const collection = Map({
        name: 'pages',
        type: FOLDER,
        folder: '_pages',
        create: true,
        fields: List([Map({ name: 'title', widget: 'string' })]),
        nested: Map({ depth: 10, subfolders: false }),
        meta: Map({ path: Map({ label: 'Path', widget: 'string' }) }),
      });
      const entryDraft = Map({
        entry: Map({
          data: Map({ title: 'Test' }),
          meta: Map({ path: 'blog' }),
          newRecord: true,
        }),
      });
      const user = { login: 'user', name: 'User' };
      const backend = new Backend(implementation, { config, backendName: 'test' });

      backend.currentUser = jest.fn().mockResolvedValue(user);
      backend.entryToRaw = jest.fn().mockReturnValue('content');
      backend.generateUniqueSlug = jest.fn().mockResolvedValue('test-slug');
      backend.invokePreSaveEvent = jest.fn().mockResolvedValue(entryDraft.get('entry'));
      backend.invokePostSaveEvent = jest.fn().mockResolvedValue();

      await backend.persistEntry({
        config,
        collection,
        entryDraft,
        assetProxies: [],
        usedSlugs: List(),
      });

      expect(implementation.persistEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          hasSubfolders: false,
        }),
      );
    });

    it('should default to hasSubfolders=true when subfolders is not specified', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
        persistEntry: jest.fn(),
      };

      const config = {
        backend: { commit_messages: {} },
      };
      const collection = Map({
        name: 'pages',
        type: FOLDER,
        folder: '_pages',
        create: true,
        fields: List([Map({ name: 'title', widget: 'string' })]),
        nested: Map({ depth: 10 }),
        meta: Map({ path: Map({ label: 'Path', widget: 'string' }) }),
      });
      const entryDraft = Map({
        entry: Map({
          data: Map({ title: 'Test' }),
          meta: Map({ path: 'blog' }),
          newRecord: true,
        }),
      });
      const user = { login: 'user', name: 'User' };
      const backend = new Backend(implementation, { config, backendName: 'test' });

      backend.currentUser = jest.fn().mockResolvedValue(user);
      backend.entryToRaw = jest.fn().mockReturnValue('content');
      backend.generateUniqueSlug = jest.fn().mockResolvedValue('test-slug');
      backend.invokePreSaveEvent = jest.fn().mockResolvedValue(entryDraft.get('entry'));
      backend.invokePostSaveEvent = jest.fn().mockResolvedValue();

      await backend.persistEntry({
        config,
        collection,
        entryDraft,
        assetProxies: [],
        usedSlugs: List(),
      });

      expect(implementation.persistEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          hasSubfolders: true,
        }),
      );
    });

    // DCMS-373: relocating an existing nested entry (e.g. an `_index.md` node with children
    // underneath it) via the `meta.path` field only moves that single index file. persistEntry
    // builds exactly one dataFile (plus i18n variants) for the entry being saved; it does not
    // enumerate or move any files that live in the entry's old folder. This test pins that
    // current, documented-as-manual behavior so a future change to it is intentional.
    it('only moves the single index file when relocating a nested entry, not its child entries', async () => {
      const implementation = {
        init: jest.fn(() => implementation),
        persistEntry: jest.fn(),
      };

      const config = {
        backend: { commit_messages: {} },
      };
      const collection = Map({
        name: 'pages',
        type: FOLDER,
        folder: '_pages',
        create: true,
        fields: List([Map({ name: 'title', widget: 'string' })]),
        nested: Map({ depth: 10, subfolders: true }),
        meta: Map({ path: Map({ label: 'Path', widget: 'string', index_file: '_index' }) }),
      });
      // Existing entry at `_pages/section/_index.md`, being moved to `_pages/renamed/_index.md`.
      // A child entry lives at `_pages/section/child/_index.md` and is not part of this draft.
      const entryDraft = Map({
        entry: Map({
          slug: 'section',
          path: '_pages/section/_index.md',
          data: Map({ title: 'Section' }),
          meta: Map({ path: 'renamed' }),
          newRecord: false,
        }),
      });
      const user = { login: 'user', name: 'User' };
      const backend = new Backend(implementation, { config, backendName: 'test' });

      backend.currentUser = jest.fn().mockResolvedValue(user);
      backend.entryToRaw = jest.fn().mockReturnValue('content');
      backend.invokePreSaveEvent = jest.fn().mockResolvedValue(entryDraft.get('entry'));
      backend.invokePostSaveEvent = jest.fn().mockResolvedValue();

      await backend.persistEntry({
        config,
        collection,
        entryDraft,
        assetProxies: [],
        usedSlugs: List(),
      });

      const [{ dataFiles }] = implementation.persistEntry.mock.calls[0];

      // Only the index file itself is included in the move — the child entry
      // (`_pages/section/child/_index.md`) is never enumerated or renamed.
      expect(dataFiles).toHaveLength(1);
      expect(dataFiles[0]).toMatchObject({
        path: '_pages/section/_index.md',
        newPath: '_pages/renamed/_index.md',
      });
    });
  });

  describe('slugFromCustomPath', () => {
    function makeCollection(folder) {
      return Map({ folder });
    }

    it('strips folder prefix and .md extension to produce slug', () => {
      const collection = makeCollection('content/posts');
      expect(slugFromCustomPath(collection, 'content/posts/my-entry.md')).toBe('my-entry');
    });

    it('includes subdirectory in slug for nested paths', () => {
      const collection = makeCollection('content/posts');
      expect(slugFromCustomPath(collection, 'content/posts/2024/my-nested-entry.md')).toBe(
        '2024/my-nested-entry',
      );
    });

    it('strips .yaml extension', () => {
      const collection = makeCollection('data');
      expect(slugFromCustomPath(collection, 'data/settings.yaml')).toBe('settings');
    });

    it('strips .json extension', () => {
      const collection = makeCollection('data');
      expect(slugFromCustomPath(collection, 'data/config.json')).toBe('config');
    });

    it('is case-insensitive when matching folder prefix', () => {
      const collection = makeCollection('Content/Posts');
      expect(slugFromCustomPath(collection, 'content/posts/hello-world.md')).toBe('hello-world');
    });
  });
});
