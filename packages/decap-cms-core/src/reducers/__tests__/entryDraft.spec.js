import { Map, fromJS } from 'immutable';

import * as actions from '../../actions/entries';
import reducer from '../entryDraft';

jest.mock('uuid', () => ({ v4: jest.fn(() => '1') }));

const initialState = Map({
  entry: Map(),
  fieldsMetaData: Map(),
  fieldsErrors: Map(),
  hasChanged: false,
  key: '',
});

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
      const state = reducer(initialState, actions.createDraftFromEntry(fromJS(entry)));
      expect(state).toEqual(
        fromJS({
          entry: {
            ...entry,
            newRecord: false,
          },
          fieldsMetaData: Map(),
          fieldsErrors: Map(),
          hasChanged: false,
          key: '1',
          mountedFields: [],
        }),
      );
    });
  });

  describe('DRAFT_CREATE_EMPTY', () => {
    it('should create a new draft ', () => {
      const state = reducer(initialState, actions.emptyDraftCreated(fromJS(entry)));
      expect(state).toEqual(
        fromJS({
          entry: {
            ...entry,
            newRecord: true,
          },
          fieldsMetaData: Map(),
          fieldsErrors: Map(),
          hasChanged: false,
          key: '1',
        }),
      );
    });
  });

  describe('DRAFT_CHANGE_FIELD', () => {
    const field = fromJS({ name: 'date' });

    it('does not mark a fresh new-record draft as changed when the value comes from a framework default (DCMS-487)', () => {
      const newRecordState = initialState
        .set('entry', fromJS({ ...entry, data: {}, newRecord: true }))
        .set('hasChanged', false);

      const newState = reducer(
        newRecordState,
        actions.changeDraftField({
          field,
          value: '2026-07-12T00:00:00.000Z',
          metadata: { fromDefault: true },
          entries: [],
        }),
      );

      expect(newState.get('hasChanged')).toBe(false);
      expect(newState.getIn(['entry', 'data', 'date'])).toBe('2026-07-12T00:00:00.000Z');
      expect(newState.get('fieldsMetaData')).toEqual(Map());
    });

    it('marks a fresh new-record draft as changed for a real user edit', () => {
      const newRecordState = initialState
        .set('entry', fromJS({ ...entry, data: {}, newRecord: true }))
        .set('hasChanged', false);

      const newState = reducer(
        newRecordState,
        actions.changeDraftField({
          field,
          value: 'typed by user',
          metadata: {},
          entries: [],
        }),
      );

      expect(newState.get('hasChanged')).toBe(true);
    });

    it('does not mark an existing, unchanged entry as changed when the value comes from a framework default (DCMS-528)', () => {
      const existingRecordState = initialState
        .set('entry', fromJS({ ...entry, data: {}, newRecord: false }))
        .set('hasChanged', false);

      const newState = reducer(
        existingRecordState,
        actions.changeDraftField({
          field,
          value: '2026-07-12T00:00:00.000Z',
          metadata: { fromDefault: true },
          entries: [fromJS({ ...entry, data: {} })],
        }),
      );

      expect(newState.get('hasChanged')).toBe(false);
      expect(newState.getIn(['entry', 'data', 'date'])).toBe('2026-07-12T00:00:00.000Z');
    });

    it('marks an existing record as changed for a real user edit', () => {
      const existingRecordState = initialState
        .set('entry', fromJS({ ...entry, data: { date: 'old-value' }, newRecord: false }))
        .set('hasChanged', false);

      const newState = reducer(
        existingRecordState,
        actions.changeDraftField({
          field,
          value: 'new-value',
          metadata: {},
          entries: [fromJS({ ...entry, data: { date: 'old-value' } })],
        }),
      );

      expect(newState.get('hasChanged')).toBe(true);
    });

    it('does not mark an existing entry as changed when a widget mount write is a no-op, even without a fromDefault tag (DCMS-560)', () => {
      // Reproduces widgets other than DateTimeControl (RichtextControl,
      // BooleanControl, MarkdownControl, ListControl) that fire a
      // mount-time onChange re-affirming the value already present in the
      // loaded entry, without tagging the write `{ fromDefault: true }`.
      // `entries` (the published/unpublished lookup used to detect
      // reverted edits) is deliberately left empty here to simulate it
      // being unavailable/stale, which used to force `hasChanged` to `true`
      // unconditionally for any non-`fromDefault` write.
      const booleanField = fromJS({ name: 'draft' });
      const existingRecordState = initialState
        .set('entry', fromJS({ ...entry, data: { draft: false }, newRecord: false }))
        .set('hasChanged', false);

      const newState = reducer(
        existingRecordState,
        actions.changeDraftField({
          field: booleanField,
          value: false,
          metadata: {},
          entries: [],
        }),
      );

      expect(newState.get('hasChanged')).toBe(false);
      expect(newState.getIn(['entry', 'data', 'draft'])).toBe(false);
    });

    it('still marks an existing entry as changed for a real edit even when entries is empty', () => {
      const booleanField = fromJS({ name: 'draft' });
      const existingRecordState = initialState
        .set('entry', fromJS({ ...entry, data: { draft: false }, newRecord: false }))
        .set('hasChanged', false);

      const newState = reducer(
        existingRecordState,
        actions.changeDraftField({
          field: booleanField,
          value: true,
          metadata: {},
          entries: [],
        }),
      );

      expect(newState.get('hasChanged')).toBe(true);
    });

    it('keeps hasChanged false for a post-persist-reload no-op write even with a stale entries baseline (DCMS-1727)', () => {
      // Reproduces the editorial-workflow regression: after a successful
      // persist, DRAFT_CREATE_FROM_ENTRY reloads the entry and remounts the
      // form (new `key`), which can cause a widget to re-dispatch the value
      // it was just handed as a mount-time write. `entries` (the
      // redux-selected published/unpublished baseline used by the caller)
      // can still be the stale pre-persist entry at that point, since it's
      // populated by a separate selector than the one that just resolved
      // the reload. The write itself is a no-op against what's already in
      // the draft, so it must not flip `hasChanged` back to `true` even
      // though it doesn't match the stale `entries` baseline.
      const persistingState = initialState
        .set(
          'entry',
          fromJS({ ...entry, data: { date: 'old-value' }, newRecord: false, isPersisting: true }),
        )
        .set('hasChanged', true);

      const afterPersistSuccess = reducer(
        persistingState,
        actions.entryPersisted(
          Map({ name: 'posts' }),
          fromJS({ ...entry, data: { date: 'old-value' } }),
          'slug',
        ),
      );
      expect(afterPersistSuccess.get('hasChanged')).toBe(false);

      const afterReloadMountWrite = reducer(
        afterPersistSuccess,
        actions.changeDraftField({
          field,
          value: 'old-value',
          metadata: {},
          // Deliberately stale: still holds the pre-persist value, unlike
          // the draft, which already reflects the reload.
          entries: [fromJS({ ...entry, data: { date: 'stale-pre-persist-value' } })],
        }),
      );

      expect(afterReloadMountWrite.get('hasChanged')).toBe(false);
    });

    it('still marks a genuine edit as changed immediately after a persist (DCMS-1727)', () => {
      const persistingState = initialState
        .set(
          'entry',
          fromJS({ ...entry, data: { date: 'old-value' }, newRecord: false, isPersisting: true }),
        )
        .set('hasChanged', true);

      const afterPersistSuccess = reducer(
        persistingState,
        actions.entryPersisted(
          Map({ name: 'posts' }),
          fromJS({ ...entry, data: { date: 'old-value' } }),
          'slug',
        ),
      );
      expect(afterPersistSuccess.get('hasChanged')).toBe(false);

      const afterUserEdit = reducer(
        afterPersistSuccess,
        actions.changeDraftField({
          field,
          value: 'typed-by-user-after-save',
          metadata: {},
          entries: [fromJS({ ...entry, data: { date: 'old-value' } })],
        }),
      );

      expect(afterUserEdit.get('hasChanged')).toBe(true);
    });

    it('keeps hasChanged false after the loadUnpublishedEntry reload remount even when a widget mount-time write is not byte-equal to the reloaded value (DCMS-1737)', () => {
      // Reproduces the gap DCMS-1727/#1736 didn't cover: after a successful
      // editorial-workflow persist, the follow-up loadUnpublishedEntry
      // dispatches DRAFT_CREATE_FROM_ENTRY, which remounts every widget
      // against the reloaded entry. A widget whose serialize/parse round
      // trip isn't byte-exact (richtext's slateToMarkdown(markdownToSlate())
      // for content like em dashes or paragraph breaks) can re-dispatch a
      // mount-time write that fails `isNoOpWrite`'s strict Immutable.equals
      // check even though it isn't a real edit. This must not flip
      // hasChanged back to true.
      const bodyField = fromJS({ name: 'body' });
      const storedMarkdown = 'Foo — bar.\n\nBaz.';
      const roundTrippedMarkdown = 'Foo -- bar.\n\nBaz.';

      const persistingState = initialState
        .set(
          'entry',
          fromJS({
            ...entry,
            data: { body: storedMarkdown },
            newRecord: false,
            isPersisting: true,
          }),
        )
        .set('hasChanged', true);

      const afterPersistSuccess = reducer(
        persistingState,
        actions.entryPersisted(
          Map({ name: 'posts' }),
          fromJS({ ...entry, data: { body: storedMarkdown } }),
          'slug',
        ),
      );
      expect(afterPersistSuccess.get('hasChanged')).toBe(false);

      // loadUnpublishedEntry's reload: DRAFT_CREATE_FROM_ENTRY remounts the
      // form against the freshly reloaded entry.
      const afterReload = reducer(
        afterPersistSuccess,
        actions.createDraftFromEntry(fromJS({ ...entry, data: { body: storedMarkdown } })),
      );
      expect(afterReload.get('hasChanged')).toBe(false);

      // The richtext widget mounts and re-dispatches its round-tripped
      // value, which is not byte-equal to the stored markdown.
      const afterMountTimeWrite = reducer(
        afterReload,
        actions.changeDraftField({
          field: bodyField,
          value: roundTrippedMarkdown,
          metadata: {},
          entries: [],
        }),
      );

      expect(afterMountTimeWrite.get('hasChanged')).toBe(false);
      expect(afterMountTimeWrite.getIn(['entry', 'data', 'body'])).toBe(roundTrippedMarkdown);
    });

    it('still flips hasChanged true for a genuine edit to the same field right after the mount-time replay (bidirectional guard, DCMS-1737)', () => {
      const bodyField = fromJS({ name: 'body' });
      const storedMarkdown = 'Foo — bar.\n\nBaz.';
      const roundTrippedMarkdown = 'Foo -- bar.\n\nBaz.';

      const persistingState = initialState
        .set(
          'entry',
          fromJS({
            ...entry,
            data: { body: storedMarkdown },
            newRecord: false,
            isPersisting: true,
          }),
        )
        .set('hasChanged', true);

      const afterPersistSuccess = reducer(
        persistingState,
        actions.entryPersisted(
          Map({ name: 'posts' }),
          fromJS({ ...entry, data: { body: storedMarkdown } }),
          'slug',
        ),
      );

      const afterReload = reducer(
        afterPersistSuccess,
        actions.createDraftFromEntry(fromJS({ ...entry, data: { body: storedMarkdown } })),
      );

      const afterMountTimeWrite = reducer(
        afterReload,
        actions.changeDraftField({
          field: bodyField,
          value: roundTrippedMarkdown,
          metadata: {},
          entries: [],
        }),
      );
      expect(afterMountTimeWrite.get('hasChanged')).toBe(false);

      // A real user edit to the very same field right after the mount-time
      // replay must still flip hasChanged - the exemption above is
      // one-shot per field, not a blanket suppression window.
      const afterRealEdit = reducer(
        afterMountTimeWrite,
        actions.changeDraftField({
          field: bodyField,
          value: 'the user actually typed this',
          metadata: {},
          entries: [],
        }),
      );

      expect(afterRealEdit.get('hasChanged')).toBe(true);
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
      initialState = fromJS({
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
      });
    });

    it('should handle persisting request', () => {
      const newState = reducer(
        initialState,
        actions.entryPersisting(Map({ name: 'posts' }), Map({ slug: 'slug' })),
      );
      expect(newState.getIn(['entry', 'isPersisting'])).toBe(true);
    });

    it('should handle persisting success', () => {
      let newState = reducer(
        initialState,
        actions.entryPersisting(Map({ name: 'posts' }), Map({ slug: 'slug' })),
      );
      newState = reducer(
        newState,
        actions.entryPersisted(Map({ name: 'posts' }), Map({ slug: 'slug' })),
      );
      expect(newState.getIn(['entry', 'isPersisting'])).toBeUndefined();
    });

    it('should handle persisting error', () => {
      let newState = reducer(
        initialState,
        actions.entryPersisting(Map({ name: 'posts' }), Map({ slug: 'slug' })),
      );
      newState = reducer(
        newState,
        actions.entryPersistFail(Map({ name: 'posts' }), Map({ slug: 'slug' }), 'Error message'),
      );
      expect(newState.getIn(['entry', 'isPersisting'])).toBeUndefined();
    });
  });

  describe('REMOVE_DRAFT_ENTRY_MEDIA_FILE', () => {
    it('should remove a media file', () => {
      const actualState = reducer(
        initialState.setIn(['entry', 'mediaFiles'], fromJS([{ id: '1' }, { id: '2' }])),
        actions.removeDraftEntryMediaFile({ id: '1' }),
      );

      expect(actualState.toJS()).toEqual({
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
        initialState.setIn(['entry', 'mediaFiles'], fromJS([{ id: '1', name: 'old' }])),
        actions.addDraftEntryMediaFile({ id: '1', name: 'new' }),
      );

      expect(actualState.toJS()).toEqual({
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
      const localBackup = Map({ entry: fromJS({ ...entry, mediaFiles: [{ id: '1' }] }) });

      const actualState = reducer(initialState.set('localBackup', localBackup), {
        type: actions.DRAFT_CREATE_FROM_LOCAL_BACKUP,
      });
      expect(actualState.toJS()).toEqual({
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

      expect(actualState.toJS()).toEqual({
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
      selectHasMetaPath = jest.fn(
        collection => collection.meta !== undefined && collection.meta.has('path'),
      );
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
      const collection = fromJS({
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string' } },
      }).toObject();
      const entryDraft = fromJS({
        entry: {
          newRecord: true,
          data: { title: 'My Great Article' },
          meta: { path: 'blog' },
        },
      });

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBe('_pages/blog/my-great-article.md');
    });

    it('should preserve filename for existing entries without index_file', () => {
      const collection = fromJS({
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string' } },
      }).toObject();
      const entryDraft = fromJS({
        entry: {
          newRecord: false,
          path: '_pages/old-folder/existing-file.md',
          data: { title: 'Updated Title' },
          meta: { path: 'new-folder' },
        },
      });

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBe('_pages/new-folder/existing-file.md');
    });

    it('should use index_file when specified (backward compatibility)', () => {
      const collection = fromJS({
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string', index_file: 'index' } },
      }).toObject();
      const entryDraft = fromJS({
        entry: {
          newRecord: true,
          data: { title: 'My Article' },
          meta: { path: 'blog' },
        },
      });

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBe('_pages/blog/index.md');
    });

    it('should return undefined when path is not set', () => {
      const collection = fromJS({
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string' } },
      }).toObject();
      const entryDraft = fromJS({
        entry: {
          newRecord: true,
          data: { title: 'My Article' },
          meta: {},
        },
      });

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBeUndefined();
    });

    it('should preserve non-latin characters in generated filename', () => {
      const collection = fromJS({
        folder: '_pages',
        extension: 'md',
        meta: { path: { label: 'Path', widget: 'string' } },
      }).toObject();
      const entryDraft = fromJS({
        entry: {
          newRecord: true,
          data: { title: '日本語のタイトル' },
          meta: { path: 'blog' },
        },
      });

      const result = selectCustomPath(collection, entryDraft);
      expect(result).toBe('_pages/blog/日本語のタイトル.md');
    });
  });
});
