import { describe, expect, it } from 'vitest';

import {
  ENTRIES_SUCCESS,
  FILTER_ENTRIES_SUCCESS,
  GROUP_ENTRIES_SUCCESS,
  SORT_ENTRIES_SUCCESS,
} from '@/core/actions/entries';
import cursors, { selectCollectionEntriesCursor } from '@/core/reducers/cursors';
import { Cursor } from '@/lib/util/index';

import type { AnyAction } from 'redux';

const defaultState = { cursorsByType: { collectionEntries: {} } };

describe('cursors', () => {
  it('should return the default state', () => {
    expect(cursors(undefined, {} as unknown as AnyAction)).toEqual(defaultState);
  });

  it('should store the cursor for a collection on ENTRIES_SUCCESS', () => {
    const cursor = Cursor.create({ data: { nextPage: 2 } });
    const state = cursors(undefined, {
      type: ENTRIES_SUCCESS,
      payload: { collection: 'posts', cursor },
    } as unknown as AnyAction);

    expect(state.cursorsByType.collectionEntries.posts).toEqual(Cursor.create(cursor).store);
  });

  it('should overwrite an existing cursor for the same collection on ENTRIES_SUCCESS', () => {
    const firstCursor = Cursor.create({ data: { nextPage: 2 } });
    const secondCursor = Cursor.create({ data: { nextPage: 3 } });

    const state1 = cursors(undefined, {
      type: ENTRIES_SUCCESS,
      payload: { collection: 'posts', cursor: firstCursor },
    } as unknown as AnyAction);
    const state2 = cursors(state1, {
      type: ENTRIES_SUCCESS,
      payload: { collection: 'posts', cursor: secondCursor },
    } as unknown as AnyAction);

    expect(state2.cursorsByType.collectionEntries.posts).toEqual(Cursor.create(secondCursor).store);
  });

  it('should keep cursors for other collections untouched on ENTRIES_SUCCESS', () => {
    const postsCursor = Cursor.create({ data: { nextPage: 2 } });
    const pagesCursor = Cursor.create({ data: { nextPage: 5 } });

    const state1 = cursors(undefined, {
      type: ENTRIES_SUCCESS,
      payload: { collection: 'posts', cursor: postsCursor },
    } as unknown as AnyAction);
    const state2 = cursors(state1, {
      type: ENTRIES_SUCCESS,
      payload: { collection: 'pages', cursor: pagesCursor },
    } as unknown as AnyAction);

    expect(state2.cursorsByType.collectionEntries.posts).toEqual(Cursor.create(postsCursor).store);
    expect(state2.cursorsByType.collectionEntries.pages).toEqual(Cursor.create(pagesCursor).store);
  });

  it.each([FILTER_ENTRIES_SUCCESS, GROUP_ENTRIES_SUCCESS, SORT_ENTRIES_SUCCESS])(
    'should remove the cursor for a collection on %s',
    actionType => {
      const cursor = Cursor.create({ data: { nextPage: 2 } });
      const state1 = cursors(undefined, {
        type: ENTRIES_SUCCESS,
        payload: { collection: 'posts', cursor },
      } as unknown as AnyAction);
      expect(state1.cursorsByType.collectionEntries.posts).toBeDefined();

      const state2 = cursors(state1, {
        type: actionType,
        payload: { collection: 'posts' },
      } as unknown as AnyAction);

      expect(state2.cursorsByType.collectionEntries.posts).toBeUndefined();
    },
  );

  it('should be a no-op when clearing a cursor for a collection that has none', () => {
    const state = cursors(undefined, {
      type: FILTER_ENTRIES_SUCCESS,
      payload: { collection: 'posts' },
    } as unknown as AnyAction);

    expect(state).toEqual(defaultState);
  });

  it('should ignore unrelated action types', () => {
    const state = cursors(undefined, { type: 'SOME_OTHER_ACTION' } as unknown as AnyAction);
    expect(state).toEqual(defaultState);
  });
});

describe('selectCollectionEntriesCursor', () => {
  it('should return an empty Cursor when no cursor is stored for the collection', () => {
    const state = cursors(undefined, {} as unknown as AnyAction);
    const cursor = selectCollectionEntriesCursor(state, 'posts');

    expect(cursor).toBeInstanceOf(Cursor);
    expect(cursor.data).toEqual({});
  });

  it('should return the stored Cursor for the collection', () => {
    const stored = Cursor.create({ data: { nextPage: 2 } });
    const state = cursors(undefined, {
      type: ENTRIES_SUCCESS,
      payload: { collection: 'posts', cursor: stored },
    } as unknown as AnyAction);

    const cursor = selectCollectionEntriesCursor(state, 'posts');

    expect(cursor).toBeInstanceOf(Cursor);
    expect(cursor.data).toEqual({ nextPage: 2 });
  });

  it('should return an empty Cursor when state is undefined', () => {
    const cursor = selectCollectionEntriesCursor(
      undefined as unknown as Parameters<typeof selectCollectionEntriesCursor>[0],
      'posts',
    );

    expect(cursor).toBeInstanceOf(Cursor);
    expect(cursor.data).toEqual({});
  });
});
