import * as actions from '../../actions/entries';
import reducer from '../entryDraft';

jest.mock('uuid', () => ({ v4: jest.fn(() => '1') }));

const initialState = {
  entry: {},
  fieldsMetaData: {},
  fieldsErrors: {},
  hasChanged: false,
  key: '',
};

const entry = {
  collection: 'posts',
  slug: 'slug',
  path: 'content/blog/art-and-wine-festival.md',
  partial: false,
  raw: '',
  data: {},
  metaData: null,
};

describe('entryDraft reducer', () => {
  describe('DRAFT_CREATE_FROM_ENTRY', () => {
    it('should create draft from the entry', () => {
      const state = reducer(initialState, actions.createDraftFromEntry(entry));
      expect(state).toEqual({
        entry: {
          ...entry,
          newRecord: false,
        },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: false,
        key: '1',
      });
    });
  });

  describe('DRAFT_CREATE_EMPTY', () => {
    it('should create a new draft ', () => {
      const state = reducer(initialState, actions.emptyDraftCreated(entry));
      expect(state).toEqual({
        entry: {
          ...entry,
          newRecord: true,
        },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: false,
        key: '1',
      });
    });
  });

  describe('DRAFT_DISCARD', () => {
    it('should discard the draft and return initial state', () => {
      expect(reducer(initialState, actions.discardDraft())).toEqual(initialState);
    });
  });

  describe('persisting', () => {
    let initialState;

    beforeEach(() => {
      initialState = {
        entities: {
          'posts.slug': {
            collection: 'posts',
            slug: 'slug',
            path: 'content/blog/art-and-wine-festival.md',
            partial: false,
            raw: '',
            data: {},
            metaData: null,
          },
        },
        pages: {},
      };
    });

    it('should handle persisting request', () => {
      const newState = reducer(
        initialState,
        actions.entryPersisting({ name: 'posts' }, { slug: 'slug' }),
      );
      expect(newState.entry.isPersisting).toBe(true);
    });

    it('should handle persisting success', () => {
      let newState = reducer(
        initialState,
        actions.entryPersisting({ name: 'posts' }, { slug: 'slug' }),
      );
      newState = reducer(newState, actions.entryPersisted({ name: 'posts' }, { slug: 'slug' }));
      expect(newState.entry.isPersisting).toBeUndefined();
    });

    it('should handle persisting error', () => {
      let newState = reducer(
        initialState,
        actions.entryPersisting({ name: 'posts' }, { slug: 'slug' }),
      );
      newState = reducer(
        newState,
        actions.entryPersistFail({ name: 'posts' }, { slug: 'slug' }, new Error('Error message')),
      );
      expect(newState.entry.isPersisting).toBeUndefined();
    });
  });

  describe('REMOVE_DRAFT_ENTRY_MEDIA_FILE', () => {
    it('should remove a media file', () => {
      const actualState = reducer(
        {
          ...initialState,
          entry: { ...initialState.entry, mediaFiles: [{ id: '1' }, { id: '2' }] },
        },
        actions.removeDraftEntryMediaFile({ id: '1' }),
      );

      expect(actualState).toEqual({
        entry: { mediaFiles: [{ id: '2' }] },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: true,
        key: '',
      });
    });
  });

  describe('ADD_DRAFT_ENTRY_MEDIA_FILE', () => {
    it('should overwrite an existing media file', () => {
      const actualState = reducer(
        {
          ...initialState,
          entry: { ...initialState.entry, mediaFiles: [{ id: '1', name: 'old' }] },
        },
        actions.addDraftEntryMediaFile({ id: '1', name: 'new' }),
      );

      expect(actualState).toEqual({
        entry: { mediaFiles: [{ id: '1', name: 'new' }] },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: true,
        key: '',
      });
    });
  });

  describe('DRAFT_CREATE_FROM_LOCAL_BACKUP', () => {
    it('should create draft from local backup', () => {
      const localBackup = { entry: { ...entry, mediaFiles: [{ id: '1' }] } };

      const actualState = reducer(
        { ...initialState, localBackup },
        {
          type: actions.DRAFT_CREATE_FROM_LOCAL_BACKUP,
        },
      );
      expect(actualState).toEqual({
        entry: {
          ...entry,
          mediaFiles: [{ id: '1' }],
          newRecord: false,
        },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: true,
        key: '1',
      });
    });
  });

  describe('DRAFT_LOCAL_BACKUP_RETRIEVED', () => {
    it('should set local backup', () => {
      const mediaFiles = [{ id: '1' }];

      const actualState = reducer(
        initialState,
        actions.localBackupRetrieved({ ...entry, mediaFiles }),
      );

      expect(actualState).toEqual({
        entry: {},
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: false,
        localBackup: {
          entry: { ...entry, mediaFiles: [{ id: '1' }] },
        },
        key: '',
      });
    });
  });

  describe('selectCustomPath', () => {
    let selectCustomPath;
    let selectHasMetaPath;
    let selectFolderEntryExtension;

    beforeEach(() => {
      jest.resetModules();
      selectHasMetaPath = jest.fn(collection => 'meta' in collection && 'path' in collection.meta);
      selectFolderEntryExtension = jest.fn(collection => collection.extension || 'md');

      jest.doMock('../collections', () => ({
        selectHasMetaPath,
        selectFolderEntryExtension,
      }));

      const entryDraftModule = require('../entryDraft');
      selectCustomPath = entryDraftModule.selectCustomPath;
    });

    afterEach(() => {
      jest.unmock('../collections');
    });

    it('should generate dynamic filename for new entries without index_file', () => {
      const collection = {
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string' } },
      };
      const entryDraft = {
        entry: {
          newRecord: true,
          data: { title: 'My Great Article' },
          meta: { path: 'blog' },
        },
      };

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBe('_pages/blog/my-great-article.md');
    });

    it('should preserve filename for existing entries without index_file', () => {
      const collection = {
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string' } },
      };
      const entryDraft = {
        entry: {
          newRecord: false,
          path: '_pages/old-folder/existing-file.md',
          data: { title: 'Updated Title' },
          meta: { path: 'new-folder' },
        },
      };

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBe('_pages/new-folder/existing-file.md');
    });

    it('should use index_file when specified (backward compatibility)', () => {
      const collection = {
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string', index_file: 'index' } },
      };
      const entryDraft = {
        entry: {
          newRecord: true,
          data: { title: 'My Article' },
          meta: { path: 'blog' },
        },
      };

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBe('_pages/blog/index.md');
    });

    it('should return undefined when path is not set', () => {
      const collection = {
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string' } },
      };
      const entryDraft = {
        entry: {
          newRecord: true,
          data: { title: 'My Article' },
          meta: {},
        },
      };

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBeUndefined();
    });

    it('should preserve non-latin characters in generated filename', () => {
      const collection = {
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string' } },
      };
      const entryDraft = {
        entry: {
          newRecord: true,
          data: { title: '日本語のタイトル' },
          meta: { path: 'blog' },
        },
      };

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBe('_pages/blog/日本語のタイトル.md');
    });
  });
});
