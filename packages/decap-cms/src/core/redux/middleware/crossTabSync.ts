import { authenticateUser, loginUser, logoutUser, sessionExpired } from '@/core/actions/auth';
import {
  UNPUBLISHED_ENTRY_DELETE_SUCCESS,
  UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
  UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
} from '@/core/actions/editorialWorkflow';
import { ENTRY_DELETE_SUCCESS, ENTRY_PERSIST_SUCCESS } from '@/core/actions/entries';
import queryCore, { collectionTag, entryTag } from '@/lib/util/queryCore';

import type { AnyAction, Middleware } from 'redux';

/**
 * Mirrors selected actions to other same-origin tabs over a BroadcastChannel,
 * so a save, publish, status change or logout in one tab is reflected in the
 * others without a refetch or reload.
 *
 * Design constraints:
 * - Only *actions* are synced, never the state tree: the tree holds per-tab
 *   slices (entryDraft, globalUI, routing) and non-cloneable values (cursor
 *   instances), so replaying whitelisted reducer updates is the only safe
 *   channel. Every broadcast action must round-trip structured clone.
 * - Replayed actions run reducers only; the originating tab has already done
 *   the backend work. Where the originating thunk pairs its success action
 *   with a queryCore invalidation, the receiving side mirrors it so relation
 *   lookups and cached listings refetch instead of serving stale data.
 * - Login cannot be replayed: the receiving tab's backend instance has no
 *   in-memory credentials, so a `loginUser.fulfilled` broadcast triggers a
 *   local `authenticateUser()` (session restore from storage) instead.
 */

const CHANNEL_NAME = 'decap-cms-cross-tab-sync';

/** Marks a replayed action so the outgoing filter never re-broadcasts it. */
const REMOTE_META = 'crossTabSync/remote';

/** Actions replayed verbatim on receiving tabs (reducer updates only). */
const REPLAY_TYPES = new Set<string>([
  sessionExpired.type,
  logoutUser.pending.type,
  ENTRY_PERSIST_SUCCESS,
  ENTRY_DELETE_SUCCESS,
  UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
  UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
  UNPUBLISHED_ENTRY_DELETE_SUCCESS,
]);

const BROADCAST_TYPES = new Set<string>([...REPLAY_TYPES, loginUser.fulfilled.type]);

function isRemote(action: AnyAction) {
  return Boolean(action.meta?.[REMOTE_META]);
}

/**
 * Deep-clones a broadcast payload, dropping function-valued keys and
 * File/Blob references so it round-trips structured clone. Backends attach
 * non-cloneable closures to entry payloads (e.g. AssetProxy.toBase64 via
 * normalizeAsset in test/azure/gitlab/github backends); receiving tabs
 * already have their own mediaLibrary.files, so these are never needed.
 */
function sanitizeForBroadcast(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
  if (typeof value === 'function') return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (typeof File !== 'undefined' && value instanceof File) return undefined;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return undefined;
  if (value instanceof Date || value instanceof RegExp) return value;

  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    for (const item of value) {
      const sanitized = sanitizeForBroadcast(item, seen);
      result.push(sanitized === undefined ? null : sanitized);
    }
    return result;
  }

  if (value instanceof Map) {
    const result = new Map();
    seen.set(value, result);
    for (const [key, val] of value) {
      const sanitized = sanitizeForBroadcast(val, seen);
      if (sanitized !== undefined) result.set(key, sanitized);
    }
    return result;
  }

  if (value instanceof Set) {
    const result = new Set();
    seen.set(value, result);
    for (const item of value) {
      const sanitized = sanitizeForBroadcast(item, seen);
      if (sanitized !== undefined) result.add(sanitized);
    }
    return result;
  }

  const result: Record<string, unknown> = {};
  seen.set(value, result);
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const sanitized = sanitizeForBroadcast(val, seen);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

/**
 * The queryCore invalidations the originating thunk performs alongside each
 * success action, mirrored here because only the action crosses the channel.
 * UNPUBLISHED_TAG is deliberately untouched for the same reason local writes
 * skip it: the replayed reducer update already carries the change.
 */
function mirrorCacheInvalidation(action: AnyAction) {
  const { type, payload } = action;
  switch (type) {
    case logoutUser.pending.type:
      queryCore.clear();
      break;
    case ENTRY_PERSIST_SUCCESS:
      queryCore.invalidateTags([
        collectionTag(payload.collectionName),
        entryTag(payload.collectionName, payload.entrySlug),
        entryTag(payload.collectionName, payload.slug),
      ]);
      break;
    case ENTRY_DELETE_SUCCESS:
      queryCore.invalidateTags([
        collectionTag(payload.collectionName),
        entryTag(payload.collectionName, payload.entrySlug),
      ]);
      break;
    case UNPUBLISHED_ENTRY_PERSIST_SUCCESS:
      queryCore.invalidateTags([collectionTag(payload.collection)]);
      break;
    case UNPUBLISHED_ENTRY_PUBLISH_SUCCESS:
      queryCore.invalidateTags([
        collectionTag(payload.collection),
        entryTag(payload.collection, payload.slug),
      ]);
      break;
    case UNPUBLISHED_ENTRY_DELETE_SUCCESS:
      queryCore.invalidateTags([collectionTag(payload.collection)]);
      break;
  }
}

export function createCrossTabSyncMiddleware(): Middleware {
  return api => {
    // Feature-detect: unsupported environments (jsdom without the mock, very
    // old browsers) get a pass-through middleware and no cross-tab sync.
    if (typeof BroadcastChannel === 'undefined') {
      return next => action => next(action);
    }

    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent) => {
      const action = event.data as AnyAction | undefined;
      if (!action || typeof action.type !== 'string') return;

      if (action.type === loginUser.fulfilled.type) {
        // Another tab signed in (or recovered an expired session). Restore
        // this tab's session from the shared stored credentials.
        const auth = api.getState()?.auth;
        if (!auth?.user || auth.sessionExpired) {
          (api.dispatch as (a: unknown) => unknown)(authenticateUser());
        }
        return;
      }

      if (!REPLAY_TYPES.has(action.type)) return;
      api.dispatch({ ...action, meta: { ...action.meta, [REMOTE_META]: true } });
      mirrorCacheInvalidation(action);
    };

    return next => (action: unknown) => {
      const result = next(action);
      const candidate = action as AnyAction | undefined;
      if (
        typeof candidate?.type === 'string'
        && BROADCAST_TYPES.has(candidate.type)
        && !isRemote(candidate)
      ) {
        // structuredClone is a cheap preflight: if it throws, the payload
        // carries a non-cloneable value (e.g. an AssetProxy.toBase64
        // closure) and must be sanitized before postMessage can accept it.
        let payload: AnyAction = candidate;
        try {
          structuredClone(candidate);
        } catch {
          payload = sanitizeForBroadcast(candidate) as AnyAction;
        }

        try {
          channel.postMessage(payload);
        } catch (error) {
          // A non-cloneable payload must never break the local dispatch.
          // This should be unreachable once sanitizeForBroadcast has run,
          // but log at debug (not warn) rather than fail the dispatch.
          console.debug(`Skipped broadcasting ${candidate.type} to other tabs: not cloneable`, error);
        }
      }
      return result;
    };
  };
}
