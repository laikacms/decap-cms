import { produce } from 'immer';

import {
  ENTRIES_SUCCESS,
  FILTER_ENTRIES_SUCCESS,
  GROUP_ENTRIES_SUCCESS,
  SORT_ENTRIES_SUCCESS,
} from '@/core/actions/entries';
import { Cursor } from '@/lib/util/index';

import type { AnyAction } from 'redux';

type CursorsState = Record<string, any>;

export function selectCollectionEntriesCursor(state: CursorsState, collectionName: string): Cursor {
  return new Cursor(state?.cursorsByType?.collectionEntries?.[collectionName] ?? {});
}

const defaultState: CursorsState = { cursorsByType: { collectionEntries: {} } };

const cursors = produce((state: CursorsState, action: AnyAction) => {
  switch (action.type) {
    case ENTRIES_SUCCESS: {
      state.cursorsByType.collectionEntries[action.payload.collection] = Cursor.create(
        action.payload.cursor,
      ).store;
      break;
    }
    case FILTER_ENTRIES_SUCCESS:
    case GROUP_ENTRIES_SUCCESS:
    case SORT_ENTRIES_SUCCESS: {
      delete state.cursorsByType.collectionEntries[action.payload.collection];
      break;
    }
  }
}, defaultState);

export default cursors;
