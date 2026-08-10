import { produce } from 'immer';

import {
  ENTRY_LOCK_ACQUIRED,
  ENTRY_LOCK_CONFLICT,
  ENTRY_LOCK_FAILURE,
  ENTRY_LOCK_RELEASED,
  ENTRY_LOCK_REQUEST,
  ENTRY_LOCK_UNSUPPORTED,
} from '@/core/actions/entryLock';

import type { EntryLockAction } from '@/core/actions/entryLock';
import type { CmsEntryLock } from '@/lib/util/index';

export type EntryLockStatus =
  | 'idle'
  | 'checking'
  | 'locked-by-me'
  | 'locked-by-other'
  | 'unsupported'
  | 'error';

export type EntryLockEntry = {
  status: EntryLockStatus,
  // A conflicting lock the backend did not describe stays undefined.
  lock?: CmsEntryLock | undefined,
  error?: string | undefined,
};

export type EntryLockState = {
  [key: string]: EntryLockEntry,
};

const defaultEntry: EntryLockEntry = { status: 'idle' };
const defaultState: EntryLockState = {};

const key = (collection: string, slug: string) => `${collection}.${slug}`;

const entryLock = produce((state: EntryLockState, action: EntryLockAction) => {
  switch (action.type) {
    case ENTRY_LOCK_REQUEST: {
      const { collection, slug } = action.payload;
      state[key(collection, slug)] = { status: 'checking' };
      break;
    }

    case ENTRY_LOCK_ACQUIRED: {
      const { collection, slug, lock } = action.payload;
      state[key(collection, slug)] = { status: 'locked-by-me', lock };
      break;
    }

    case ENTRY_LOCK_CONFLICT: {
      const { collection, slug, lock } = action.payload;
      state[key(collection, slug)] = { status: 'locked-by-other', lock: lock ?? undefined };
      break;
    }

    case ENTRY_LOCK_FAILURE: {
      const { collection, slug, error } = action.payload;
      state[key(collection, slug)] = { status: 'error', error };
      break;
    }

    case ENTRY_LOCK_RELEASED: {
      const { collection, slug } = action.payload;
      delete state[key(collection, slug)];
      break;
    }

    case ENTRY_LOCK_UNSUPPORTED: {
      const { collection, slug } = action.payload;
      state[key(collection, slug)] = { status: 'unsupported' };
      break;
    }
  }
}, defaultState);

export function selectEntryLock(state: EntryLockState, collection: string, slug: string): EntryLockEntry {
  return state[key(collection, slug)] ?? defaultEntry;
}

export default entryLock;
