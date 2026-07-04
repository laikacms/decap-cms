import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {
  createEmptyDraft,
  createEmptyDraftData,
  retrieveLocalBackup,
  persistLocalBackup,
  getMediaAssets,
  validateMetaField,
  persistEntry,
} from '../entries';
import AssetProxy from '../../valueObjects/AssetProxy';

jest.mock('../../backend');
jest.mock('decap-cms-lib-util');
jest.mock('../mediaLibrary');
jest.mock('../../reducers/entries');
jest.mock('../../reducers/entryDraft');

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('entries', () => {
  describe('createEmptyDraft', () => {
    const { currentBackend } = require('../../backend');
    const backend = {
      processEntry: jest.fn((_state, _collection, entry) => Promise.resolve(entry)),
    };

    currentBackend.mockReturnValue(backend);

    beforeEach(() => {
      jest.clearAllMocks();
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
            partial: false,
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
            partial: false,
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
              partial: false,
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
              partial: false,
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
  });

  describe('persistLocalBackup', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should persist local backup with media files', () => {
      const { currentBackend } = require('../../backend');

      const backend = {
        persistLocalDraftBackup: jest.fn(() => Promise.resolve()),
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
      jest.clearAllMocks();
    });

    it('should retrieve media files with local backup', () => {
      const { currentBackend } = require('../../backend');
      const { createAssetProxy } = require('../../valueObjects/AssetProxy');

      const backend = {
        getLocalDraftBackup: jest.fn((...args) => args),
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
      jest.clearAllMocks();
    });

    it('should map mediaFiles to assets', () => {
      const mediaFiles = [{ path: 'path1' }, { path: 'path2', draft: true }];

      const entry = { mediaFiles };
      expect(getMediaAssets({ entry })).toEqual([new AssetProxy({ path: 'path2' })]);
    });
  });

  describe('persistEntry', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reject with an Error (not undefined) when draft has presence validation errors', () => {
      const store = mockStore({
        config: {},
        entryDraft: {
          entry: {},
          fieldsErrors: {
            title: [{ type: 'PRESENCE', message: 'Required' }],
          },
        },
        entries: {},
        integrations: {},
        mediaLibrary: { files: [] },
      });

      const collection = { name: 'posts', fields: [{ name: 'title', required: true }] };

      return expect(store.dispatch(persistEntry(collection))).rejects.toEqual(
        new Error('Entry has validation errors'),
      );
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
    const t = jest.fn((key, args) => ({ key, args }));

    const { selectCustomPath } = require('../../reducers/entryDraft');
    const { selectEntryByPath } = require('../../reducers/entries');

    beforeEach(() => {
      jest.clearAllMocks();
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
});
