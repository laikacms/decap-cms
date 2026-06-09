import { fromJS } from 'immutable';
import { Cursor } from 'decap-cms-lib-util';

import cursors, { selectCollectionEntriesCursor } from '../cursors';
import {
  ENTRIES_SUCCESS,
  FILTER_ENTRIES_SUCCESS,
  SORT_ENTRIES_SUCCESS,
  GROUP_ENTRIES_SUCCESS,
} from '../../actions/entries';

const initialState = fromJS({ cursorsByType: { collectionEntries: {} } });

describe('cursors reducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(cursors(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  describe(`${ENTRIES_SUCCESS}`, () => {
    it('stores the cursor under the correct collection key', () => {
      const cursor = Cursor.create({ actions: ['next'], data: { nextPage: 2 } });
      const action = {
        type: ENTRIES_SUCCESS,
        payload: {
          collection: 'posts',
          entries: [],
          page: 1,
          cursor,
          append: false,
        },
      };

      const state = cursors(undefined, action);
      const stored = state.getIn(['cursorsByType', 'collectionEntries', 'posts']);
      expect(stored).toEqual(cursor.store);
    });

    it('stores cursors independently per collection', () => {
      const cursorA = Cursor.create({ actions: ['next'] });
      const cursorB = Cursor.create({ actions: ['prev'] });

      let state = cursors(undefined, {
        type: ENTRIES_SUCCESS,
        payload: { collection: 'posts', entries: [], page: 1, cursor: cursorA, append: false },
      });
      state = cursors(state, {
        type: ENTRIES_SUCCESS,
        payload: { collection: 'authors', entries: [], page: 1, cursor: cursorB, append: false },
      });

      const storedPosts = state.getIn(['cursorsByType', 'collectionEntries', 'posts']);
      const storedAuthors = state.getIn(['cursorsByType', 'collectionEntries', 'authors']);

      expect(storedPosts).toEqual(cursorA.store);
      expect(storedAuthors).toEqual(cursorB.store);
    });
  });

  describe(`${FILTER_ENTRIES_SUCCESS}`, () => {
    it('deletes the cursor for the collection', () => {
      const cursor = Cursor.create({ actions: ['next'] });
      let state = cursors(undefined, {
        type: ENTRIES_SUCCESS,
        payload: { collection: 'posts', entries: [], page: 1, cursor, append: false },
      });

      state = cursors(state, {
        type: FILTER_ENTRIES_SUCCESS,
        payload: { collection: 'posts' },
      });

      expect(state.getIn(['cursorsByType', 'collectionEntries', 'posts'])).toBeUndefined();
    });
  });

  describe(`${SORT_ENTRIES_SUCCESS}`, () => {
    it('deletes the cursor for the collection', () => {
      const cursor = Cursor.create({ actions: ['next'] });
      let state = cursors(undefined, {
        type: ENTRIES_SUCCESS,
        payload: { collection: 'posts', entries: [], page: 1, cursor, append: false },
      });

      state = cursors(state, {
        type: SORT_ENTRIES_SUCCESS,
        payload: { collection: 'posts' },
      });

      expect(state.getIn(['cursorsByType', 'collectionEntries', 'posts'])).toBeUndefined();
    });
  });

  describe(`${GROUP_ENTRIES_SUCCESS}`, () => {
    it('deletes the cursor for the collection', () => {
      const cursor = Cursor.create({ actions: ['next'] });
      let state = cursors(undefined, {
        type: ENTRIES_SUCCESS,
        payload: { collection: 'posts', entries: [], page: 1, cursor, append: false },
      });

      state = cursors(state, {
        type: GROUP_ENTRIES_SUCCESS,
        payload: { collection: 'posts' },
      });

      expect(state.getIn(['cursorsByType', 'collectionEntries', 'posts'])).toBeUndefined();
    });
  });

  describe('selectCollectionEntriesCursor', () => {
    it('returns a Cursor instance for a stored collection key', () => {
      const cursor = Cursor.create({ actions: ['next'], data: { nextPage: 3 } });
      const state = cursors(undefined, {
        type: ENTRIES_SUCCESS,
        payload: { collection: 'posts', entries: [], page: 1, cursor, append: false },
      });

      const result = selectCollectionEntriesCursor(state, 'posts');
      expect(result).toBeInstanceOf(Cursor);
      expect(result.store).toEqual(cursor.store);
    });

    it('returns a default empty Cursor for a missing collection key', () => {
      const result = selectCollectionEntriesCursor(initialState, 'nonexistent');
      expect(result).toBeInstanceOf(Cursor);
      // default Cursor has no actions
      expect(result.actions.size).toBe(0);
    });
  });
});
