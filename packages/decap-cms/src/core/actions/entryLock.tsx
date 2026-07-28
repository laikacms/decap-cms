import { currentBackend } from '@/core/backend';
import { selectEntryLock } from '@/core/reducers/selectors';

import type { CmsCollectionState, CmsEntryLock, CmsEntryLockOwner } from '@/lib/util/index';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

type Collection = CmsCollectionState;
type State = any;

export const ENTRY_LOCK_REQUEST = 'ENTRY_LOCK_REQUEST';
export const ENTRY_LOCK_ACQUIRED = 'ENTRY_LOCK_ACQUIRED';
export const ENTRY_LOCK_CONFLICT = 'ENTRY_LOCK_CONFLICT';
export const ENTRY_LOCK_FAILURE = 'ENTRY_LOCK_FAILURE';
export const ENTRY_LOCK_RELEASED = 'ENTRY_LOCK_RELEASED';
export const ENTRY_LOCK_UNSUPPORTED = 'ENTRY_LOCK_UNSUPPORTED';

/**
 * The lock "path" is the advisory-lock namespace key, deliberately coarser
 * than a data-file path: a single entry can have several underlying data
 * files (i18n multiple_folders), but the CMS locks the *entry edit session*
 * as one unit, matching what the editor actually opens/closes.
 */
export function entryLockPath(collectionName: string, slug: string): string {
  return `${collectionName}/${slug}`;
}

/**
 * Owner identity for lock calls. Falls back to `login` when the backend
 * doesn't populate `name` (some auth providers only supply an email/login).
 */
export function currentLockOwner(state: State): CmsEntryLockOwner | null {
  const user = state.auth?.user;
  if (!user?.login) return null;
  return { id: user.login, name: user.name || user.login };
}

function entryLockRequest(collection: string, slug: string) {
  return { type: ENTRY_LOCK_REQUEST, payload: { collection, slug } } as const;
}

function entryLockAcquired(collection: string, slug: string, lock: CmsEntryLock) {
  return { type: ENTRY_LOCK_ACQUIRED, payload: { collection, slug, lock } } as const;
}

function entryLockConflict(collection: string, slug: string, lock: CmsEntryLock | null) {
  return { type: ENTRY_LOCK_CONFLICT, payload: { collection, slug, lock } } as const;
}

function entryLockFailure(collection: string, slug: string, error: string) {
  return { type: ENTRY_LOCK_FAILURE, payload: { collection, slug, error } } as const;
}

function entryLockReleased(collection: string, slug: string) {
  return { type: ENTRY_LOCK_RELEASED, payload: { collection, slug } } as const;
}

function entryLockUnsupported(collection: string, slug: string) {
  return { type: ENTRY_LOCK_UNSUPPORTED, payload: { collection, slug } } as const;
}

/**
 * Acquire (or renew) the advisory lock for `collection/slug`. No-ops
 * (dispatches `ENTRY_LOCK_UNSUPPORTED`, once) when the active backend
 * doesn't implement the optional locking capability, or when there is no
 * signed-in user identity to lock under.
 */
export function acquireEntryLock(collection: Collection, slug: string, opts: { force?: boolean } = {}) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    const collectionName = collection.name;

    if (!backend.supportsEntryLocking()) {
      dispatch(entryLockUnsupported(collectionName, slug));
      return;
    }

    const owner = currentLockOwner(state);
    if (!owner) {
      dispatch(entryLockUnsupported(collectionName, slug));
      return;
    }

    dispatch(entryLockRequest(collectionName, slug));
    const path = entryLockPath(collectionName, slug);

    try {
      const lock = await backend.acquireEntryLock(path, owner, opts.force ?? false);
      if (!lock) {
        dispatch(entryLockUnsupported(collectionName, slug));
        return;
      }
      dispatch(entryLockAcquired(collectionName, slug, lock));
    } catch (error: unknown) {
      // The backend rejected the acquire — most likely someone else holds a
      // live lock. Fetch the current holder (when the backend can report
      // one) so the UI can show who, rather than a bare error.
      try {
        const currentLock = await backend.getEntryLock(path);
        dispatch(entryLockConflict(collectionName, slug, currentLock));
      } catch {
        dispatch(entryLockFailure(collectionName, slug, error instanceof Error ? error.message : String(error)));
      }
    }
  };
}

/** Explicit user override of someone else's lock. */
export function overrideEntryLock(collection: Collection, slug: string) {
  return acquireEntryLock(collection, slug, { force: true });
}

/**
 * Extend the TTL of a lock we believe we hold. Called periodically while an
 * entry stays open. A conflict here means someone else force-took the lock
 * out from under us mid-session — surfaced the same way as a pre-acquire
 * conflict, so the banner reappears.
 */
export function refreshEntryLock(collection: Collection, slug: string) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    const collectionName = collection.name;
    if (!backend.supportsEntryLocking()) return;

    const owner = currentLockOwner(state);
    if (!owner) return;

    // Only refresh while we still believe we hold the lock -- a refresh
    // issued after we've already lost it (or never had it) would silently
    // re-acquire and mask a conflict the user hasn't been shown yet.
    const current = selectEntryLock(state, collectionName, slug);
    if (current?.status !== 'locked-by-me') return;

    const path = entryLockPath(collectionName, slug);
    try {
      const lock = await backend.refreshEntryLock(path, owner);
      if (lock) dispatch(entryLockAcquired(collectionName, slug, lock));
    } catch {
      try {
        const currentLock = await backend.getEntryLock(path);
        dispatch(entryLockConflict(collectionName, slug, currentLock));
      } catch {
        // Transient failure (network blip) - leave the existing lock state
        // as-is; the next refresh tick will retry.
      }
    }
  };
}

/** Release the lock on entry-close. Safe to call even if we never held one. */
export function releaseEntryLock(collection: Collection, slug: string) {
  return async (_dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    const collectionName = collection.name;
    if (!backend.supportsEntryLocking()) return;

    const owner = currentLockOwner(state);
    if (!owner) return;

    const path = entryLockPath(collectionName, slug);
    try {
      await backend.releaseEntryLock(path, owner);
    } catch (error: unknown) {
      console.warn(`Failed to release entry lock for ${path}`, error);
    } finally {
      _dispatch(entryLockReleased(collectionName, slug));
    }
  };
}

export type EntryLockAction = ReturnType<
  | typeof entryLockRequest
  | typeof entryLockAcquired
  | typeof entryLockConflict
  | typeof entryLockFailure
  | typeof entryLockReleased
  | typeof entryLockUnsupported
>;
