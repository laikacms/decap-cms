vi.mock('uuid', () => ({ v4: vi.fn(() => '1') }));

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as actions from '../../actions/entries';
import reducer from '../entryDraft';

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
});
