import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEmptyDraft,
  createEmptyDraftData,
  createQuickCreateEntryData,
  getMediaAssets,
  persistEntry,
  persistLocalBackup,
  persistQuickCreateEntry,
  retrieveLocalBackup,
  validateMetaField,
  withDefaultsBackfilled,
} from '@/core/actions/entries';
import { FOLDER } from '@/core/constants/collectionTypes';
import * as backendModule from '@/core/backend';
import * as entriesReducer from '@/core/reducers/entries';
import * as entryDraftReducer from '@/core/reducers/entryDraft';
import AssetProxy from '@/core/valueObjects/AssetProxy';
import * as assetProxyModule from '@/core/valueObjects/AssetProxy';

vi.mock('../../backend');
vi.mock('decap-cms-lib-util');
vi.mock('../mediaLibrary');
vi.mock('../../reducers/entries');
vi.mock('../../reducers/entryDraft');

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('entries', () => {
  describe('createEmptyDraft', () => {
    const currentBackend = vi.mocked(backendModule.currentBackend);
    const backend = {
      processEntry: vi.fn((_state, _collection, entry) => Promise.resolve(entry)),
    };

    currentBackend.mockReturnValue(backend);

    beforeEach(() => {
      vi.clearAllMocks();
    });
    it('should dispatch draft created action', () => {
      const store = mockStore({ mediaLibrary: { files: [] } });

      const collection = {
        fields: [{ name: 'title' }],
      };

      return store.dispatch(createEmptyDraft(collection, '')).then(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(1);

        expect(actions[0]).toEqual({
          payload: {
            author: '',
            collection: undefined,
            data: {},
            meta: {},
            i18n: {},
            isModification: null,
            label: null,
            mediaFiles: [],
            projected: false,
            path: '',
            raw: '',
            slug: '',
            status: '',
            updatedOn: '',
          },
          type: 'DRAFT_CREATE_EMPTY',
        });
      });
    });

    it('should populate draft entry from URL param', () => {
      const store = mockStore({ mediaLibrary: { files: [] } });

      const collection = {
        fields: [{ name: 'title' }, { name: 'boolean' }],
      };

      return store.dispatch(createEmptyDraft(collection, '?title=title&boolean=True')).then(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(1);

        expect(actions[0]).toEqual({
          payload: {
            author: '',
            collection: undefined,
            data: { title: 'title', boolean: true },
            meta: {},
            i18n: {},
            isModification: null,
            label: null,
            mediaFiles: [],
            projected: false,
            path: '',
            raw: '',
            slug: '',
            status: '',
            updatedOn: '',
          },
          type: 'DRAFT_CREATE_EMPTY',
        });
      });
    });

    it('should populate draft entry from repeated URL param', () => {
      const store = mockStore({ mediaLibrary: { files: [] } });

      const collection = {
        fields: [{ name: 'post', multiple: true }],
      };

      return store
        .dispatch(createEmptyDraft(collection, '?post=2026-05-07-test&post=2026-05-08-test'))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);

          expect(actions[0]).toEqual({
            payload: {
              author: '',
              collection: undefined,
              data: { post: ['2026-05-07-test', '2026-05-08-test'] },
              meta: {},
              i18n: {},
              isModification: null,
              label: null,
              mediaFiles: [],
              projected: false,
              path: '',
              raw: '',
              slug: '',
              status: '',
              updatedOn: '',
            },
            type: 'DRAFT_CREATE_EMPTY',
          });
        });
    });

    it('should html escape URL params', () => {
      const store = mockStore({ mediaLibrary: { files: [] } });

      const collection = {
        fields: [{ name: 'title' }],
      };

      return store
        .dispatch(createEmptyDraft(collection, "?title=<script>alert('hello')</script>"))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);

          expect(actions[0]).toEqual({
            payload: {
              author: '',
              collection: undefined,
              data: { title: '&lt;script&gt;alert(&#039;hello&#039;)&lt;/script&gt;' },
              meta: {},
              i18n: {},
              isModification: null,
              label: null,
              mediaFiles: [],
              projected: false,
              path: '',
              raw: '',
              slug: '',
              status: '',
              updatedOn: '',
            },
            type: 'DRAFT_CREATE_EMPTY',
          });
        });
    });
  });
  describe('createEmptyDraftData', () => {
    it('should allow an empty array as list default for a single field list', () => {
      const fields = [
        {
          name: 'images',
          widget: 'list',
          default: [],
          field: { name: 'url', widget: 'text' },
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({ images: [] });
    });

    it('should allow a complex array as list default for a single field list', () => {
      const fields = [
        {
          name: 'images',
          widget: 'list',
          default: [
            {
              url: 'https://image.png',
            },
          ],
          field: { name: 'url', widget: 'text' },
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({
        images: [
          {
            url: 'https://image.png',
          },
        ],
      });
    });

    it('should allow an empty array as list default for a fields list', () => {
      const fields = [
        {
          name: 'images',
          widget: 'list',
          default: [],
          fields: [
            { name: 'title', widget: 'text' },
            { name: 'url', widget: 'text' },
          ],
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({ images: [] });
    });

    it('should allow a complex array as list default for a fields list', () => {
      const fields = [
        {
          name: 'images',
          widget: 'list',
          default: [
            {
              title: 'default image',
              url: 'https://image.png',
            },
          ],
          fields: [
            { name: 'title', widget: 'text' },
            { name: 'url', widget: 'text' },
          ],
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({
        images: [
          {
            title: 'default image',
            url: 'https://image.png',
          },
        ],
      });
    });

    it('should use field default when no list default is provided', () => {
      const fields = [
        {
          name: 'images',
          widget: 'list',
          field: { name: 'url', widget: 'text', default: 'https://image.png' },
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({ images: [{ url: 'https://image.png' }] });
    });

    it('should use fields default when no list default is provided', () => {
      const fields = [
        {
          name: 'images',
          widget: 'list',
          fields: [
            { name: 'title', widget: 'text', default: 'default image' },
            { name: 'url', widget: 'text', default: 'https://image.png' },
          ],
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({
        images: [{ title: 'default image', url: 'https://image.png' }],
      });
    });

    it('should not set empty value for list fields widget', () => {
      const fields = [
        {
          name: 'images',
          widget: 'list',
          fields: [
            { name: 'title', widget: 'text' },
            { name: 'url', widget: 'text' },
          ],
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({});
    });

    it('should set default value for object field widget', () => {
      const fields = [
        {
          name: 'post',
          widget: 'object',
          field: { name: 'image', widget: 'text', default: 'https://image.png' },
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({ post: { image: 'https://image.png' } });
    });

    it('should set default values for object fields widget', () => {
      const fields = [
        {
          name: 'post',
          widget: 'object',
          fields: [
            { name: 'title', widget: 'text', default: 'default title' },
            { name: 'url', widget: 'text', default: 'https://image.png' },
          ],
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({
        post: { title: 'default title', url: 'https://image.png' },
      });
    });

    it('should not set empty value for object fields widget', () => {
      const fields = [
        {
          name: 'post',
          widget: 'object',
          fields: [
            { name: 'title', widget: 'text' },
            { name: 'url', widget: 'text' },
          ],
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({});
    });

    it('should populate nested fields', () => {
      const fields = [
        {
          name: 'names',
          widget: 'list',
          field: {
            name: 'object',
            widget: 'object',
            fields: [
              { name: 'first', widget: 'string', default: 'first' },
              { name: 'second', widget: 'string', default: 'second' },
            ],
          },
        },
      ];
      expect(createEmptyDraftData(fields)).toEqual({
        names: [{ object: { first: 'first', second: 'second' } }],
      });
    });

    // DCMS-1802
    it('should backfill a missing key from baseData with the field default', () => {
      const fields = [{ name: 'draft', widget: 'boolean', default: false }];
      expect(createEmptyDraftData(fields, undefined, {})).toEqual({ draft: false });
    });

    // DCMS-1802
    it('should not overwrite an explicit false value already present in baseData', () => {
      const fields = [{ name: 'draft', widget: 'boolean', default: true }];
      expect(createEmptyDraftData(fields, undefined, { draft: false })).toEqual({ draft: false });
    });

    // DCMS-1802
    it('should not overwrite any explicit value already present in baseData', () => {
      const fields = [{ name: 'subtitle', widget: 'text', default: 'fallback' }];
      expect(createEmptyDraftData(fields, undefined, { subtitle: 'existing' })).toEqual({
        subtitle: 'existing',
      });
    });

    // DCMS-1802
    it('should preserve baseData keys not covered by any field', () => {
      const fields = [{ name: 'draft', widget: 'boolean', default: false }];
      expect(createEmptyDraftData(fields, undefined, { title: 'existing' })).toEqual({
        title: 'existing',
        draft: false,
      });
    });
  });

  describe('withDefaultsBackfilled', () => {
    it('should fill in a missing boolean key using the field default, without flagging it required-empty', () => {
      const collection = {
        name: 'posts',
        type: 'folder_based_collection',
        folder: '_posts',
        fields: [
          { name: 'title', widget: 'string' },
          { name: 'draft', widget: 'boolean', default: false },
        ],
      };
      const entry = { slug: 'legacy-post', data: { title: 'A legacy post' } };

      const result = withDefaultsBackfilled(collection as any, entry as any);

      expect(result.data).toEqual({ title: 'A legacy post', draft: false });
    });

    it('should not overwrite an entry that already has an explicit value for the field', () => {
      const collection = {
        name: 'posts',
        type: 'folder_based_collection',
        folder: '_posts',
        fields: [{ name: 'draft', widget: 'boolean', default: false }],
      };
      const entry = { slug: 'a-post', data: { draft: true } };

      const result = withDefaultsBackfilled(collection as any, entry as any);

      expect(result.data).toEqual({ draft: true });
    });

    it('should return the entry untouched when the collection is malformed (missing type)', () => {
      const collection = {
        name: 'posts',
        folder: '_posts',
        fields: [{ name: 'draft', widget: 'boolean', default: false }],
      };
      const entry = { slug: 'a-post', data: { title: 'A legacy post' } };

      const result = withDefaultsBackfilled(collection as any, entry as any);

      expect(result).toBe(entry);
    });
  });

  describe('persistLocalBackup', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should persist local backup with media files', () => {
      const currentBackend = vi.mocked(backendModule.currentBackend);

      const backend = {
        persistLocalDraftBackup: vi.fn(() => Promise.resolve()),
      };

      const store = mockStore({
        config: {},
      });

      currentBackend.mockReturnValue(backend);

      const collection = {};
      const mediaFiles = [{ path: 'static/media/image.png' }];
      const entry = { mediaFiles };

      return store.dispatch(persistLocalBackup(entry, collection)).then(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(0);

        expect(backend.persistLocalDraftBackup).toHaveBeenCalledTimes(1);
        expect(backend.persistLocalDraftBackup).toHaveBeenCalledWith(entry, collection);
      });
    });
  });

  describe('retrieveLocalBackup', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should retrieve media files with local backup', () => {
      const currentBackend = vi.mocked(backendModule.currentBackend);
      const createAssetProxy = vi.mocked(assetProxyModule.createAssetProxy);

      const backend = {
        getLocalDraftBackup: vi.fn((...args) => args),
      };

      const store = mockStore({
        config: {},
      });

      currentBackend.mockReturnValue(backend);

      const collection = {
        name: 'collection',
      };
      const slug = 'slug';

      const file = new File([], 'image.png');
      const mediaFiles = [{ path: 'static/media/image.png', url: 'url', file }];
      const asset = createAssetProxy(mediaFiles[0]);
      const entry = { mediaFiles };

      backend.getLocalDraftBackup.mockReturnValue({ entry });

      return store.dispatch(retrieveLocalBackup(collection, slug)).then(() => {
        const actions = store.getActions();

        expect(actions).toHaveLength(2);

        expect(actions[0]).toEqual({
          type: 'ADD_ASSETS',
          payload: [asset],
        });
        expect(actions[1]).toEqual({
          type: 'DRAFT_LOCAL_BACKUP_RETRIEVED',
          payload: { entry },
        });
      });
    });
  });

  describe('getMediaAssets', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should map mediaFiles to assets', () => {
      const mediaFiles = [{ path: 'path1' }, { path: 'path2', draft: true }];

      const entry = { mediaFiles };
      expect(getMediaAssets({ entry })).toEqual([new AssetProxy({ path: 'path2' })]);
    });
  });

  // DCMS-1422 (partial): `unique: true` field option validated at save time.
  describe('persistEntry - unique field validation', () => {
    const collection = {
      name: 'posts',
      type: FOLDER,
      folder: '_posts',
      fields: [
        { name: 'title', label: 'Title', widget: 'string' },
        { name: 'email', label: 'Email', widget: 'string', unique: true },
      ],
    };

    const currentBackend = vi.mocked(backendModule.currentBackend);
    const selectEntries = vi.mocked(entriesReducer.selectEntries);
    const selectPublishedSlugs = vi.mocked(entriesReducer.selectPublishedSlugs);

    let backend: { persistEntry: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      vi.clearAllMocks();
      backend = { persistEntry: vi.fn(() => Promise.resolve('post-c')) };
      currentBackend.mockReturnValue(backend as never);
      selectPublishedSlugs.mockReturnValue([]);
    });

    function makeState(entryDraft: Record<string, unknown>) {
      return {
        config: {},
        entries: {},
        entryDraft,
      };
    }

    it('rejects and does not persist when another entry already has the value', async () => {
      selectEntries.mockReturnValue([
        { slug: 'post-a', data: { title: 'A', email: 'shared@example.com' }, mediaFiles: [] },
        { slug: 'post-b', data: { title: 'B', email: 'b@example.com' }, mediaFiles: [] },
      ] as never);

      const store = mockStore(
        makeState({
          fieldsErrors: {},
          entry: { slug: 'post-c', data: { title: 'C', email: 'shared@example.com' }, mediaFiles: [] },
        }),
      );

      await expect(store.dispatch(persistEntry(collection as never) as never)).rejects.toBeUndefined();

      expect(backend.persistEntry).not.toHaveBeenCalled();
      const actions = store.getActions();
      expect(
        actions.some(
          (action: any) =>
            action.type === 'NOTIFICATION_SEND' && action.payload?.message?.key === 'ui.toast.notUniqueField',
        ),
      ).toBe(true);
    });

    it('persists when no other entry has the value', async () => {
      selectEntries.mockReturnValue([
        { slug: 'post-a', data: { title: 'A', email: 'a@example.com' }, mediaFiles: [] },
      ] as never);

      const store = mockStore(
        makeState({
          fieldsErrors: {},
          entry: { slug: 'post-c', data: { title: 'C', email: 'c@example.com' }, mediaFiles: [] },
        }),
      );

      await store.dispatch(persistEntry(collection as never) as never);

      expect(backend.persistEntry).toHaveBeenCalled();
    });

    it('excludes the entry being saved from its own conflict check', async () => {
      selectEntries.mockReturnValue([
        { slug: 'post-a', data: { title: 'A', email: 'a@example.com' }, mediaFiles: [] },
      ] as never);

      backend.persistEntry.mockReturnValue(Promise.resolve('post-a'));

      const store = mockStore(
        makeState({
          fieldsErrors: {},
          entry: { slug: 'post-a', data: { title: 'A (edited)', email: 'a@example.com' }, mediaFiles: [] },
        }),
      );

      await store.dispatch(persistEntry(collection as never) as never);

      expect(backend.persistEntry).toHaveBeenCalled();
    });
  });

  describe('validateMetaField', () => {
    const state = {
      config: {
        slug: {
          encoding: 'unicode',
          clean_accents: false,
          sanitize_replacement: '-',
        },
      },
      entries: [],
    };
    const collection = {
      folder: 'folder',
      type: 'folder_based_collection',
      name: 'name',
    };
    const t = vi.fn((key, args) => ({ key, args }));

    const selectCustomPath = vi.mocked(entryDraftReducer.selectCustomPath);
    const selectEntryByPath = vi.mocked(entriesReducer.selectEntryByPath);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should not return error on non meta field', () => {
      expect(validateMetaField(null, null, {}, null, t)).toEqual({ error: false });
    });

    it('should not return error on meta path field', () => {
      expect(validateMetaField(null, null, { meta: true, name: 'other' }, null, t)).toEqual({
        error: false,
      });
    });

    it('should return error on empty path', () => {
      expect(validateMetaField(null, null, { meta: true, name: 'path' }, null, t)).toEqual({
        error: {
          message: {
            key: 'editor.editorControlPane.widget.invalidPath',
            args: { path: null },
          },
          type: 'CUSTOM',
        },
      });

      expect(validateMetaField(null, null, { meta: true, name: 'path' }, undefined, t)).toEqual({
        error: {
          message: {
            key: 'editor.editorControlPane.widget.invalidPath',
            args: { path: undefined },
          },
          type: 'CUSTOM',
        },
      });

      expect(validateMetaField(null, null, { meta: true, name: 'path' }, '', t)).toEqual({
        error: {
          message: {
            key: 'editor.editorControlPane.widget.invalidPath',
            args: { path: '' },
          },
          type: 'CUSTOM',
        },
      });
    });

    it('should return error on invalid path', () => {
      expect(
        validateMetaField(state, null, { meta: true, name: 'path' }, 'invalid path', t),
      ).toEqual({
        error: {
          message: {
            key: 'editor.editorControlPane.widget.invalidPath',
            args: { path: 'invalid path' },
          },
          type: 'CUSTOM',
        },
      });
    });

    it('should return error on existing path', () => {
      selectCustomPath.mockReturnValue('existing-path');
      selectEntryByPath.mockReturnValue({ path: 'existing-path' });
      expect(
        validateMetaField(
          {
            ...state,
            entryDraft: {
              entry: {},
            },
          },
          collection,
          { meta: true, name: 'path' },
          'existing-path',
          t,
        ),
      ).toEqual({
        error: {
          message: {
            key: 'editor.editorControlPane.widget.pathExists',
            args: { path: 'existing-path' },
          },
          type: 'CUSTOM',
        },
      });

      expect(selectCustomPath).toHaveBeenCalledTimes(1);
      expect(selectCustomPath).toHaveBeenCalledWith(collection, {
        entry: { meta: { path: 'existing-path' } },
        fieldsErrors: {},
        hasChanged: false,
        key: '',
      });

      expect(selectEntryByPath).toHaveBeenCalledTimes(1);
      expect(selectEntryByPath).toHaveBeenCalledWith(
        state.entries,
        collection.name,
        'existing-path',
      );
    });

    it('should not return error on non existing path for new entry', () => {
      selectCustomPath.mockReturnValue('non-existing-path');
      selectEntryByPath.mockReturnValue(undefined);
      expect(
        validateMetaField(
          {
            ...state,
            entryDraft: {
              entry: {},
            },
          },
          collection,
          { meta: true, name: 'path' },
          'non-existing-path',
          t,
        ),
      ).toEqual({
        error: false,
      });
    });

    it('should not return error when for existing entry', () => {
      selectCustomPath.mockReturnValue('existing-path');
      selectEntryByPath.mockReturnValue({ path: 'existing-path' });
      expect(
        validateMetaField(
          {
            ...state,
            entryDraft: {
              entry: { path: 'existing-path' },
            },
          },
          collection,
          { meta: true, name: 'path' },
          'existing-path',
          t,
        ),
      ).toEqual({
        error: false,
      });
    });
  });

  // Inline "create new entry from a relation field" (DCMS-1421). Runs
  // entirely outside `state.entryDraft` so it can't clobber whatever entry
  // the user is currently editing.
  describe('createQuickCreateEntryData', () => {
    it('backfills unset fields with their defaults and overlays the given data', () => {
      const collection = {
        name: 'posts',
        type: FOLDER,
        fields: [
          { name: 'title' },
          { name: 'draft', default: false },
        ],
      };

      const entry = createQuickCreateEntryData(collection, { title: 'Quick post' });

      expect(entry.collection).toEqual('posts');
      expect(entry.data).toEqual({ title: 'Quick post', draft: false });
      expect(entry.slug).toEqual('');
    });
  });

  describe('persistQuickCreateEntry', () => {
    const currentBackend = vi.mocked(backendModule.currentBackend);

    const collection = {
      name: 'posts',
      type: FOLDER,
      create: true,
      fields: [{ name: 'title' }, { name: 'slug' }],
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('rejects when the target collection does not allow new entries', async () => {
      const store = mockStore({ config: {}, entries: {} });
      const readOnlyCollection = { ...collection, create: false };

      await expect(
        store.dispatch(persistQuickCreateEntry(readOnlyCollection, { title: 'Quick post' })),
      ).rejects.toThrow('Not allowed to create new entries in this collection');
    });

    it('persists a brand-new entry outside state.entryDraft and dispatches ENTRY_PERSIST_SUCCESS', async () => {
      const backend = {
        processEntry: vi.fn((_state, _collection, entry) => Promise.resolve(entry)),
        persistEntry: vi.fn(() => Promise.resolve('quick-post')),
      };
      currentBackend.mockReturnValue(backend);

      const store = mockStore({
        config: { backend: {} },
        entries: {},
        entryDraft: { entry: { collection: 'other', slug: 'unrelated-in-progress-draft' } },
      });

      const data = await store.dispatch(
        persistQuickCreateEntry(collection, { title: 'Quick post', slug: 'quick-post' }),
      );

      expect(data).toEqual({ title: 'Quick post', slug: 'quick-post' });

      expect(backend.persistEntry).toHaveBeenCalledTimes(1);
      const [[persistArgs]] = backend.persistEntry.mock.calls;
      // The synthetic draft must carry only the new entry, never the entry
      // the user is currently editing (`state.entryDraft`).
      expect(persistArgs.entryDraft.entry.collection).toEqual('posts');
      expect(persistArgs.entryDraft.entry.newRecord).toBe(true);

      const actions = store.getActions();
      expect(actions).toEqual([
        expect.objectContaining({
          type: 'ENTRY_PERSIST_SUCCESS',
          payload: expect.objectContaining({ collectionName: 'posts', slug: 'quick-post' }),
        }),
      ]);
    });

    it('propagates a persist failure without dispatching success', async () => {
      const backend = {
        processEntry: vi.fn((_state, _collection, entry) => Promise.resolve(entry)),
        persistEntry: vi.fn(() => Promise.reject(new Error('network down'))),
      };
      currentBackend.mockReturnValue(backend);

      const store = mockStore({ config: {}, entries: {}, entryDraft: { entry: {} } });

      await expect(
        store.dispatch(persistQuickCreateEntry(collection, { title: 'Quick post' })),
      ).rejects.toThrow('network down');

      expect(store.getActions()).toEqual([]);
    });
  });
});
