vi.mock('uuid', () => ({ v4: vi.fn(() => '1') }));

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as actions from '@/core/actions/entries';
import { FOLDER } from '@/core/constants/collectionTypes';
import reducer, { selectCustomPath } from '@/core/reducers/entryDraft';

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
    let persistInitialState;

    beforeEach(() => {
      persistInitialState = {
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
        persistInitialState,
        actions.entryPersisting({ name: 'posts' }, { slug: 'slug' }),
      );
      expect(newState.entry?.isPersisting).toBe(true);
    });

    it('should handle persisting success', () => {
      let newState = reducer(
        persistInitialState,
        actions.entryPersisting({ name: 'posts' }, { slug: 'slug' }),
      );
      newState = reducer(newState, actions.entryPersisted({ name: 'posts' }, { slug: 'slug' }));
      expect(newState.entry?.isPersisting).toBeUndefined();
    });

    it('should handle persisting error', () => {
      let newState = reducer(
        persistInitialState,
        actions.entryPersisting({ name: 'posts' }, { slug: 'slug' }),
      );
      newState = reducer(
        newState,
        actions.entryPersistFail({ name: 'posts' }, { slug: 'slug' }, 'Error message'),
      );
      expect(newState.entry?.isPersisting).toBeUndefined();
    });
  });

  describe('REMOVE_DRAFT_ENTRY_MEDIA_FILE', () => {
    it('should remove a media file', () => {
      const stateWithMedia = {
        ...initialState,
        entry: { ...initialState.entry, mediaFiles: [{ id: '1' }, { id: '2' }] },
      };
      const actualState = reducer(stateWithMedia, actions.removeDraftEntryMediaFile({ id: '1' }));

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
      const stateWithMedia = {
        ...initialState,
        entry: { ...initialState.entry, mediaFiles: [{ id: '1', name: 'old' }] },
      };
      const actualState = reducer(
        stateWithMedia,
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
      const stateWithBackup = { ...initialState, localBackup };

      const actualState = reducer(stateWithBackup, {
        type: actions.DRAFT_CREATE_FROM_LOCAL_BACKUP,
      });
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

  describe('DRAFT_CHANGE_FIELD', () => {
    const field = { name: 'date' };

    it('does not mark a fresh new-record draft as changed when the value comes from a framework default (DCMS-416)', () => {
      const newRecordState = {
        ...initialState,
        entry: { ...entry, data: {}, newRecord: true },
      };

      const newState = reducer(
        newRecordState,
        actions.changeDraftField({
          field,
          value: '2026-07-09T00:00:00.000Z',
          metadata: { fromDefault: true },
          entries: [],
        }),
      );

      expect(newState.hasChanged).toBe(false);
      expect((newState.entry as any).data.date).toBe('2026-07-09T00:00:00.000Z');
      expect(newState.fieldsMetaData).toEqual({});
    });

    it('marks a fresh new-record draft as changed for a real user edit', () => {
      const newRecordState = {
        ...initialState,
        entry: { ...entry, data: {}, newRecord: true },
      };

      const newState = reducer(
        newRecordState,
        actions.changeDraftField({
          field,
          value: 'typed by user',
          metadata: {},
          entries: [],
        }),
      );

      expect(newState.hasChanged).toBe(true);
    });

    it('still computes hasChanged normally for fromDefault changes on an existing record', () => {
      const existingRecordState = {
        ...initialState,
        entry: { ...entry, data: { date: 'old-value' }, newRecord: false },
      };

      const newState = reducer(
        existingRecordState,
        actions.changeDraftField({
          field,
          value: 'new-value',
          metadata: { fromDefault: true },
          entries: [{ ...entry, data: { date: 'old-value' } } as any],
        }),
      );

      expect(newState.hasChanged).toBe(true);
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
          fieldsErrors: {},
          hasChanged: false,
          key: '',
        },
        key: '',
      });
    });
  });

  describe('selectCustomPath', () => {
    const collection = {
      name: 'pages',
      label: 'Pages',
      folder: '_pages',
      extension: 'md',
      type: FOLDER,
      meta: { path: { label: 'Path', widget: 'string' } },
    } as any;

    it('should generate dynamic filename for new entries without index_file', () => {
      const entryDraft = {
        entry: {
          newRecord: true,
          data: { title: 'My Great Article' },
          meta: { path: 'blog' },
        },
      } as any;

      expect(selectCustomPath(collection, entryDraft)).toBe('_pages/blog/my-great-article.md');
    });

    it('should preserve filename for existing entries without index_file', () => {
      const entryDraft = {
        entry: {
          newRecord: false,
          path: '_pages/old-folder/existing-file.md',
          data: { title: 'Updated Title' },
          meta: { path: 'new-folder' },
        },
      } as any;

      expect(selectCustomPath(collection, entryDraft)).toBe(
        '_pages/new-folder/existing-file.md',
      );
    });

    it('should use index_file when specified (backward compatibility)', () => {
      const collectionWithIndexFile = {
        ...collection,
        meta: { path: { label: 'Path', widget: 'string', index_file: 'index' } },
      };
      const entryDraft = {
        entry: {
          newRecord: true,
          data: { title: 'My Article' },
          meta: { path: 'blog' },
        },
      } as any;

      expect(selectCustomPath(collectionWithIndexFile, entryDraft)).toBe('_pages/blog/index.md');
    });

    it('should return undefined when path is not set', () => {
      const entryDraft = {
        entry: {
          newRecord: true,
          data: { title: 'My Article' },
          meta: {},
        },
      } as any;

      expect(selectCustomPath(collection, entryDraft)).toBeUndefined();
    });

    it('should preserve non-latin characters in generated filename', () => {
      const entryDraft = {
        entry: {
          newRecord: true,
          data: { title: '日本語のタイトル' },
          meta: { path: 'blog' },
        },
      } as any;

      expect(selectCustomPath(collection, entryDraft)).toBe('_pages/blog/日本語のタイトル.md');
    });
  });
});
