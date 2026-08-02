import { fromJS, List, Map } from 'immutable';
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
  persistQuickCreateEntry,
  createQuickCreateEntryData,
  withDefaultsBackfilled,
} from '../entries';
import AssetProxy from '../../valueObjects/AssetProxy';
import { FOLDER } from '../../constants/collectionTypes';

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
      const store = mockStore({ mediaLibrary: fromJS({ files: [] }) });

      const collection = fromJS({
        fields: [{ name: 'title' }],
      }).toObject();

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
      const store = mockStore({ mediaLibrary: fromJS({ files: [] }) });

      const collection = fromJS({
        fields: [{ name: 'title' }, { name: 'boolean' }],
      }).toObject();

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
      const store = mockStore({ mediaLibrary: fromJS({ files: [] }) });

      const collection = fromJS({
        fields: [{ name: 'post', multiple: true }],
      }).toObject();

      return store
        .dispatch(createEmptyDraft(collection, '?post=2026-05-07-test&post=2026-05-08-test'))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);

          expect(actions[0]).toEqual({
            payload: {
              author: '',
              collection: undefined,
              data: { post: List(['2026-05-07-test', '2026-05-08-test']) },
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

    it('should split a comma-separated URL param into a list for multiple: true fields (DCMS-575)', () => {
      const store = mockStore({ mediaLibrary: fromJS({ files: [] }) });

      const collection = fromJS({
        fields: [{ name: 'tags', multiple: true }],
      }).toObject();

      return store.dispatch(createEmptyDraft(collection, '?tags=a,b,c')).then(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(1);
        expect(actions[0].payload.data).toEqual({ tags: List(['a', 'b', 'c']) });
      });
    });

    it('should not html escape URL params (DCMS-448)', () => {
      const store = mockStore({ mediaLibrary: fromJS({ files: [] }) });

      const collection = fromJS({
        fields: [{ name: 'title' }],
      }).toObject();

      return store
        .dispatch(createEmptyDraft(collection, "?title=<script>alert('hello')</script>"))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);

          expect(actions[0]).toEqual({
            payload: {
              author: '',
              collection: undefined,
              data: { title: "<script>alert('hello')</script>" },
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

    it('should round-trip punctuation in URL params as the literal value (DCMS-448)', () => {
      const store = mockStore({ mediaLibrary: fromJS({ files: [] }) });

      const collection = fromJS({
        fields: [{ name: 'title' }],
      }).toObject();

      const value = `O'Brien's "quoted" <tag> & more`;

      return store
        .dispatch(createEmptyDraft(collection, `?title=${encodeURIComponent(value)}`))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].payload.data).toEqual({ title: value });
        });
    });
  });
  describe('createEmptyDraftData', () => {
    it('should allow an empty array as list default for a single field list', () => {
      const fields = fromJS([
        {
          name: 'images',
          widget: 'list',
          default: [],
          field: { name: 'url', widget: 'text' },
        },
      ]);
      expect(createEmptyDraftData(fields)).toEqual({ images: fromJS([]) });
    });

    it('should allow a complex array as list default for a single field list', () => {
      const fields = fromJS([
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
      ]);
      expect(createEmptyDraftData(fields)).toEqual({
        images: fromJS([
          {
            url: 'https://image.png',
          },
        ]),
      });
    });

    it('should allow an empty array as list default for a fields list', () => {
      const fields = fromJS([
        {
          name: 'images',
          widget: 'list',
          default: [],
          fields: [
            { name: 'title', widget: 'text' },
            { name: 'url', widget: 'text' },
          ],
        },
      ]);
      expect(createEmptyDraftData(fields)).toEqual({ images: fromJS([]) });
    });

    it('should allow a complex array as list default for a fields list', () => {
      const fields = fromJS([
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
      ]);
      expect(createEmptyDraftData(fields)).toEqual({
        images: fromJS([
          {
            title: 'default image',
            url: 'https://image.png',
          },
        ]),
      });
    });

    it('should use field default when no list default is provided', () => {
      const fields = fromJS([
        {
          name: 'images',
          widget: 'list',
          field: { name: 'url', widget: 'text', default: 'https://image.png' },
        },
      ]);
      expect(createEmptyDraftData(fields)).toEqual({ images: [{ url: 'https://image.png' }] });
    });

    it('should use fields default when no list default is provided', () => {
      const fields = fromJS([
        {
          name: 'images',
          widget: 'list',
          fields: [
            { name: 'title', widget: 'text', default: 'default image' },
            { name: 'url', widget: 'text', default: 'https://image.png' },
          ],
        },
      ]);
      expect(createEmptyDraftData(fields)).toEqual({
        images: [{ title: 'default image', url: 'https://image.png' }],
      });
    });

    it('should default nested text fields with no default to an empty string for list fields widget', () => {
      const fields = fromJS([
        {
          name: 'images',
          widget: 'list',
          fields: [
            { name: 'title', widget: 'text' },
            { name: 'url', widget: 'text' },
          ],
        },
      ]);
      expect(createEmptyDraftData(fields)).toEqual({
        images: [{ title: '', url: '' }],
      });
    });

    it('should set default value for object field widget', () => {
      const fields = fromJS([
        {
          name: 'post',
          widget: 'object',
          field: { name: 'image', widget: 'text', default: 'https://image.png' },
        },
      ]);
      expect(createEmptyDraftData(fields)).toEqual({ post: { image: 'https://image.png' } });
    });

    it('should set default values for object fields widget', () => {
      const fields = fromJS([
        {
          name: 'post',
          widget: 'object',
          fields: [
            { name: 'title', widget: 'text', default: 'default title' },
            { name: 'url', widget: 'text', default: 'https://image.png' },
          ],
        },
      ]);
      expect(createEmptyDraftData(fields)).toEqual({
        post: { title: 'default title', url: 'https://image.png' },
      });
    });

    it('should default nested text fields with no default to an empty string for object fields widget', () => {
      const fields = fromJS([
        {
          name: 'post',
          widget: 'object',
          fields: [
            { name: 'title', widget: 'text' },
            { name: 'url', widget: 'text' },
          ],
        },
      ]);
      expect(createEmptyDraftData(fields)).toEqual({
        post: { title: '', url: '' },
      });
    });

    it('should populate nested fields', () => {
      const fields = fromJS([
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
      ]);
      expect(createEmptyDraftData(fields)).toEqual({
        names: [{ object: { first: 'first', second: 'second' } }],
      });
    });

    it('should default an optional boolean field with no default to false', () => {
      const fields = fromJS([{ name: 'featured', widget: 'boolean', required: false }]);
      expect(createEmptyDraftData(fields)).toEqual({ featured: false });
    });

    it('should default an optional text field with no default to an empty string', () => {
      const fields = fromJS([{ name: 'subtitle', widget: 'text', required: false }]);
      expect(createEmptyDraftData(fields)).toEqual({ subtitle: '' });
    });

    it('should not set a default for a required boolean field with no default', () => {
      const fields = fromJS([{ name: 'featured', widget: 'boolean' }]);
      expect(createEmptyDraftData(fields)).toEqual({});
    });

    it('should default a text field with required omitted and no default to an empty string', () => {
      const fields = fromJS([{ name: 'subtitle', widget: 'text' }]);
      expect(createEmptyDraftData(fields)).toEqual({ subtitle: '' });
    });

    it('should default a required text field with no default to an empty string', () => {
      const fields = fromJS([{ name: 'subtitle', widget: 'text', required: true }]);
      expect(createEmptyDraftData(fields)).toEqual({ subtitle: '' });
    });

    it('should not set a default for other optional widgets with no default', () => {
      const fields = fromJS([{ name: 'count', widget: 'number', required: false }]);
      expect(createEmptyDraftData(fields)).toEqual({});
    });

    // DCMS-480
    it('should backfill a missing key from baseData with the field default', () => {
      const fields = fromJS([{ name: 'draft', widget: 'boolean', default: false }]);
      expect(createEmptyDraftData(fields, undefined, {})).toEqual({ draft: false });
    });

    // DCMS-480
    it('should not overwrite an explicit false value already present in baseData', () => {
      const fields = fromJS([{ name: 'draft', widget: 'boolean', default: true }]);
      expect(createEmptyDraftData(fields, undefined, { draft: false })).toEqual({ draft: false });
    });

    // DCMS-480
    it('should not overwrite any explicit value already present in baseData', () => {
      const fields = fromJS([{ name: 'subtitle', widget: 'text', default: 'fallback' }]);
      expect(createEmptyDraftData(fields, undefined, { subtitle: 'existing' })).toEqual({
        subtitle: 'existing',
      });
    });

    // DCMS-480
    it('should preserve baseData keys not covered by any field', () => {
      const fields = fromJS([{ name: 'draft', widget: 'boolean', default: false }]);
      expect(createEmptyDraftData(fields, undefined, { title: 'existing' })).toEqual({
        title: 'existing',
        draft: false,
      });
    });
  });

  describe('withDefaultsBackfilled', () => {
    it('should fill in a missing boolean key using the field default, without flagging it required-empty', () => {
      const collection = fromJS({
        name: 'posts',
        type: FOLDER,
        folder: '_posts',
        fields: [
          { name: 'title', widget: 'string' },
          { name: 'draft', widget: 'boolean', default: false },
        ],
      }).toObject();
      const entry = { slug: 'legacy-post', data: { title: 'A legacy post' } };

      const result = withDefaultsBackfilled(collection, entry);

      expect(result.data).toEqual({ title: 'A legacy post', draft: false });
    });

    it('should not overwrite an entry that already has an explicit value for the field', () => {
      const collection = fromJS({
        name: 'posts',
        type: FOLDER,
        folder: '_posts',
        fields: [{ name: 'draft', widget: 'boolean', default: false }],
      }).toObject();
      const entry = { slug: 'a-post', data: { draft: true } };

      const result = withDefaultsBackfilled(collection, entry);

      expect(result.data).toEqual({ draft: true });
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
        config: Map(),
      });

      currentBackend.mockReturnValue(backend);

      const collection = Map();
      const mediaFiles = [{ path: 'static/media/image.png' }];
      const entry = fromJS({ mediaFiles });

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
        config: Map(),
      });

      currentBackend.mockReturnValue(backend);

      const collection = Map({
        name: 'collection',
      });
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
      const mediaFiles = fromJS([{ path: 'path1' }, { path: 'path2', draft: true }]);

      const entry = Map({ mediaFiles });
      expect(getMediaAssets({ entry })).toEqual([new AssetProxy({ path: 'path2' })]);
    });
  });

  describe('persistEntry', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reject with an Error (not undefined) when draft has presence validation errors', () => {
      const store = mockStore({
        config: Map(),
        entryDraft: fromJS({
          entry: {},
          fieldsErrors: {
            title: [{ type: 'PRESENCE', message: 'Required' }],
          },
        }),
        entries: fromJS({}),
        integrations: {},
        mediaLibrary: fromJS({ files: [] }),
      });

      const collection = fromJS({
        name: 'posts',
        fields: [{ name: 'title', required: true }],
      }).toObject();

      return expect(store.dispatch(persistEntry(collection))).rejects.toEqual(
        new Error('Entry has validation errors'),
      );
    });

    it('should reject with the original Error (not the entryPersistFail action) when the backend persist fails', () => {
      const { currentBackend } = require('../../backend');
      const persistError = new Error('Failed to persist entry');
      const backend = {
        persistEntry: jest.fn(() => Promise.reject(persistError)),
      };
      currentBackend.mockReturnValue(backend);

      const store = mockStore({
        config: Map(),
        entryDraft: fromJS({
          entry: { data: {}, mediaFiles: [] },
          fieldsErrors: {},
        }),
        entries: fromJS({}),
        integrations: {},
        mediaLibrary: fromJS({ files: [] }),
      });

      const collection = fromJS({
        name: 'posts',
        type: FOLDER,
        folder: 'posts',
        fields: [{ name: 'title' }],
      }).toObject();

      return expect(store.dispatch(persistEntry(collection))).rejects.toBe(persistError);
    });
  });

  describe('createQuickCreateEntryData', () => {
    it('backfills fields missing from data with the same defaults createEmptyDraft uses', () => {
      const collection = fromJS({
        name: 'posts',
        fields: [{ name: 'title' }, { name: 'draft', widget: 'boolean', default: false }],
      }).toObject();

      const entry = createQuickCreateEntryData(collection, { title: 'Quick post' });

      expect(entry.data).toEqual({ title: 'Quick post', draft: false });
    });

    it('lets caller-supplied data override a field default', () => {
      const collection = fromJS({
        name: 'posts',
        fields: [{ name: 'draft', widget: 'boolean', default: false }],
      }).toObject();

      const entry = createQuickCreateEntryData(collection, { draft: true });

      expect(entry.data).toEqual({ draft: true });
    });
  });

  describe('persistQuickCreateEntry (DCMS-1421)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('rejects without touching the backend when the collection disallows new entries', () => {
      const { currentBackend } = require('../../backend');
      const backend = {
        processEntry: jest.fn(),
        persistEntry: jest.fn(),
      };
      currentBackend.mockReturnValue(backend);

      const store = mockStore({
        config: Map(),
        entries: fromJS({}),
        integrations: {},
        mediaLibrary: fromJS({ files: [] }),
      });

      const collection = fromJS({
        name: 'pages',
        type: FOLDER,
        folder: 'pages',
        create: false,
        fields: [{ name: 'title' }],
      }).toObject();

      return expect(store.dispatch(persistQuickCreateEntry(collection, { title: 'x' })))
        .rejects.toEqual(new Error('Not allowed to create new entries in this collection'))
        .then(() => {
          expect(backend.processEntry).not.toHaveBeenCalled();
          expect(backend.persistEntry).not.toHaveBeenCalled();
        });
    });

    it('persists a new entry built from the quick-add data and returns its saved data', async () => {
      const { currentBackend } = require('../../backend');
      const backend = {
        processEntry: jest.fn((_state, _collection, entry) => Promise.resolve(entry)),
        persistEntry: jest.fn(() => Promise.resolve('post-slug')),
      };
      currentBackend.mockReturnValue(backend);

      const store = mockStore({
        config: Map(),
        entries: fromJS({}),
        integrations: {},
        mediaLibrary: fromJS({ files: [] }),
      });

      const collection = fromJS({
        name: 'posts',
        type: FOLDER,
        folder: 'posts',
        create: true,
        fields: [{ name: 'title' }, { name: 'slug' }],
      }).toObject();

      const result = await store.dispatch(
        persistQuickCreateEntry(collection, { title: 'Quick post', slug: 'quick-post' }),
      );

      expect(result).toEqual({ title: 'Quick post', slug: 'quick-post' });
      expect(backend.persistEntry).toHaveBeenCalledTimes(1);

      const persistCall = backend.persistEntry.mock.calls[0][0];
      expect(persistCall.collection).toBe(collection);
      expect(persistCall.entryDraft.getIn(['entry', 'data']).toJS()).toEqual({
        title: 'Quick post',
        slug: 'quick-post',
      });

      const actions = store.getActions();
      expect(actions).toEqual([expect.objectContaining({ type: 'ENTRY_PERSIST_SUCCESS' })]);
    });

    it('does not touch state.entryDraft, leaving the currently open entry untouched', async () => {
      const { currentBackend } = require('../../backend');
      const backend = {
        processEntry: jest.fn((_state, _collection, entry) => Promise.resolve(entry)),
        persistEntry: jest.fn(() => Promise.resolve('post-slug')),
      };
      currentBackend.mockReturnValue(backend);

      const openEntryDraft = fromJS({
        entry: { slug: 'currently-open', data: { title: 'Do not touch' } },
        fieldsErrors: {},
      });

      const store = mockStore({
        config: Map(),
        entryDraft: openEntryDraft,
        entries: fromJS({}),
        integrations: {},
        mediaLibrary: fromJS({ files: [] }),
      });

      const collection = fromJS({
        name: 'posts',
        type: FOLDER,
        folder: 'posts',
        create: true,
        fields: [{ name: 'title' }],
      }).toObject();

      await store.dispatch(persistQuickCreateEntry(collection, { title: 'Quick post' }));

      const persistCall = backend.persistEntry.mock.calls[0][0];
      expect(persistCall.entryDraft).not.toBe(openEntryDraft);
      expect(persistCall.entryDraft.getIn(['entry', 'slug'])).not.toBe('currently-open');
    });

    it('propagates the original error when the backend persist fails', () => {
      const { currentBackend } = require('../../backend');
      const persistError = new Error('Failed to persist entry');
      const backend = {
        processEntry: jest.fn((_state, _collection, entry) => Promise.resolve(entry)),
        persistEntry: jest.fn(() => Promise.reject(persistError)),
      };
      currentBackend.mockReturnValue(backend);

      const store = mockStore({
        config: Map(),
        entries: fromJS({}),
        integrations: {},
        mediaLibrary: fromJS({ files: [] }),
      });

      const collection = fromJS({
        name: 'posts',
        type: FOLDER,
        folder: 'posts',
        create: true,
        fields: [{ name: 'title' }],
      }).toObject();

      return expect(
        store.dispatch(persistQuickCreateEntry(collection, { title: 'Quick post' })),
      ).rejects.toBe(persistError);
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
      entries: fromJS([]),
    };
    const collection = fromJS({
      folder: 'folder',
      type: FOLDER,
      name: 'name',
    }).toObject();
    const t = jest.fn((key, args) => ({ key, args }));

    const { selectCustomPath } = require('../../reducers/entryDraft');
    const { selectEntryByPath } = require('../../reducers/entries');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not return error on non meta field', () => {
      expect(validateMetaField(null, null, fromJS({}), null, t)).toEqual({ error: false });
    });

    it('should not return error on meta path field', () => {
      expect(validateMetaField(null, null, fromJS({ meta: true, name: 'other' }), null, t)).toEqual(
        { error: false },
      );
    });

    it('should return error on empty path', () => {
      expect(validateMetaField(null, null, fromJS({ meta: true, name: 'path' }), null, t)).toEqual({
        error: {
          message: {
            key: 'editor.editorControlPane.widget.invalidPath',
            args: { path: null },
          },
          type: 'CUSTOM',
        },
      });

      expect(
        validateMetaField(null, null, fromJS({ meta: true, name: 'path' }), undefined, t),
      ).toEqual({
        error: {
          message: {
            key: 'editor.editorControlPane.widget.invalidPath',
            args: { path: undefined },
          },
          type: 'CUSTOM',
        },
      });

      expect(validateMetaField(null, null, fromJS({ meta: true, name: 'path' }), '', t)).toEqual({
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
        validateMetaField(state, null, fromJS({ meta: true, name: 'path' }), 'invalid path', t),
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
      selectEntryByPath.mockReturnValue(fromJS({ path: 'existing-path' }));
      expect(
        validateMetaField(
          {
            ...state,
            entryDraft: fromJS({
              entry: {},
            }),
          },
          collection,
          fromJS({ meta: true, name: 'path' }),
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
      expect(selectCustomPath).toHaveBeenCalledWith(
        collection,
        fromJS({ entry: { meta: { path: 'existing-path' } } }),
      );

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
            entryDraft: fromJS({
              entry: {},
            }),
          },
          collection,
          fromJS({ meta: true, name: 'path' }),
          'non-existing-path',
          t,
        ),
      ).toEqual({
        error: false,
      });
    });

    it('should not return error when for existing entry', () => {
      selectCustomPath.mockReturnValue('existing-path');
      selectEntryByPath.mockReturnValue(fromJS({ path: 'existing-path' }));
      expect(
        validateMetaField(
          {
            ...state,
            entryDraft: fromJS({
              entry: { path: 'existing-path' },
            }),
          },
          collection,
          fromJS({ meta: true, name: 'path' }),
          'existing-path',
          t,
        ),
      ).toEqual({
        error: false,
      });
    });
  });
});
