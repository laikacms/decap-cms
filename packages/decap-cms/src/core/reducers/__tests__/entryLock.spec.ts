import { describe, expect, it } from 'vitest';

import {
  ENTRY_LOCK_ACQUIRED,
  ENTRY_LOCK_CONFLICT,
  ENTRY_LOCK_FAILURE,
  ENTRY_LOCK_RELEASED,
  ENTRY_LOCK_REQUEST,
  ENTRY_LOCK_UNSUPPORTED,
} from '@/core/actions/entryLock';
import entryLock, { selectEntryLock } from '@/core/reducers/entryLock';

const lock = {
  path: 'posts/my-post',
  owner: { id: 'bob', name: 'Bob' },
  acquiredAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-01T00:05:00.000Z',
};

describe('entryLock reducer', () => {
  it('defaults an untouched entry to idle', () => {
    const state = entryLock(undefined, { type: 'UNKNOWN' } as any);
    expect(selectEntryLock(state, 'posts', 'my-post')).toEqual({ status: 'idle' });
  });

  it('ENTRY_LOCK_REQUEST sets checking', () => {
    const state = entryLock(undefined, {
      type: ENTRY_LOCK_REQUEST,
      payload: { collection: 'posts', slug: 'my-post' },
    } as any);
    expect(selectEntryLock(state, 'posts', 'my-post')).toEqual({ status: 'checking' });
  });

  it('ENTRY_LOCK_ACQUIRED stores the lock as locked-by-me', () => {
    const state = entryLock(undefined, {
      type: ENTRY_LOCK_ACQUIRED,
      payload: { collection: 'posts', slug: 'my-post', lock },
    } as any);
    expect(selectEntryLock(state, 'posts', 'my-post')).toEqual({ status: 'locked-by-me', lock });
  });

  it('ENTRY_LOCK_CONFLICT stores the other holder as locked-by-other', () => {
    const state = entryLock(undefined, {
      type: ENTRY_LOCK_CONFLICT,
      payload: { collection: 'posts', slug: 'my-post', lock },
    } as any);
    expect(selectEntryLock(state, 'posts', 'my-post')).toEqual({ status: 'locked-by-other', lock });
  });

  it('ENTRY_LOCK_CONFLICT tolerates a missing lock detail', () => {
    const state = entryLock(undefined, {
      type: ENTRY_LOCK_CONFLICT,
      payload: { collection: 'posts', slug: 'my-post', lock: null },
    } as any);
    expect(selectEntryLock(state, 'posts', 'my-post')).toEqual({ status: 'locked-by-other', lock: undefined });
  });

  it('ENTRY_LOCK_FAILURE records the error', () => {
    const state = entryLock(undefined, {
      type: ENTRY_LOCK_FAILURE,
      payload: { collection: 'posts', slug: 'my-post', error: 'boom' },
    } as any);
    expect(selectEntryLock(state, 'posts', 'my-post')).toEqual({ status: 'error', error: 'boom' });
  });

  it('ENTRY_LOCK_UNSUPPORTED marks the entry unsupported', () => {
    const state = entryLock(undefined, {
      type: ENTRY_LOCK_UNSUPPORTED,
      payload: { collection: 'posts', slug: 'my-post' },
    } as any);
    expect(selectEntryLock(state, 'posts', 'my-post')).toEqual({ status: 'unsupported' });
  });

  it('ENTRY_LOCK_RELEASED clears back to idle', () => {
    const acquired = entryLock(undefined, {
      type: ENTRY_LOCK_ACQUIRED,
      payload: { collection: 'posts', slug: 'my-post', lock },
    } as any);
    const released = entryLock(acquired, {
      type: ENTRY_LOCK_RELEASED,
      payload: { collection: 'posts', slug: 'my-post' },
    } as any);
    expect(selectEntryLock(released, 'posts', 'my-post')).toEqual({ status: 'idle' });
  });

  it('keys locks per collection/slug independently', () => {
    let state = entryLock(undefined, {
      type: ENTRY_LOCK_ACQUIRED,
      payload: { collection: 'posts', slug: 'a', lock: { ...lock, path: 'posts/a' } },
    } as any);
    state = entryLock(state, {
      type: ENTRY_LOCK_CONFLICT,
      payload: { collection: 'posts', slug: 'b', lock: { ...lock, path: 'posts/b' } },
    } as any);
    expect(selectEntryLock(state, 'posts', 'a').status).toBe('locked-by-me');
    expect(selectEntryLock(state, 'posts', 'b').status).toBe('locked-by-other');
  });
});
