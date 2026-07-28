import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  acquireEntryLock,
  ENTRY_LOCK_ACQUIRED,
  ENTRY_LOCK_CONFLICT,
  ENTRY_LOCK_RELEASED,
  ENTRY_LOCK_REQUEST,
  ENTRY_LOCK_UNSUPPORTED,
  overrideEntryLock,
  releaseEntryLock,
  refreshEntryLock,
} from '@/core/actions/entryLock';
import * as backendModule from '@/core/backend';

vi.mock('../../backend');

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

const collection = { name: 'posts' } as any;
const lock = {
  path: 'posts/my-post',
  owner: { id: 'bob', name: 'Bob' },
  acquiredAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-01T00:05:00.000Z',
};

describe('entryLock actions', () => {
  const currentBackend = vi.mocked(backendModule.currentBackend);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('acquireEntryLock', () => {
    it('dispatches ENTRY_LOCK_UNSUPPORTED when the backend has no lock capability', async () => {
      currentBackend.mockReturnValue({ supportsEntryLocking: () => false } as any);
      const store = mockStore({ auth: { user: { login: 'alice', name: 'Alice' } } });

      await store.dispatch(acquireEntryLock(collection, 'my-post') as any);

      expect(store.getActions()).toEqual([
        { type: ENTRY_LOCK_UNSUPPORTED, payload: { collection: 'posts', slug: 'my-post' } },
      ]);
    });

    it('dispatches ENTRY_LOCK_UNSUPPORTED when there is no signed-in user', async () => {
      currentBackend.mockReturnValue({ supportsEntryLocking: () => true } as any);
      const store = mockStore({ auth: {} });

      await store.dispatch(acquireEntryLock(collection, 'my-post') as any);

      expect(store.getActions()).toEqual([
        { type: ENTRY_LOCK_UNSUPPORTED, payload: { collection: 'posts', slug: 'my-post' } },
      ]);
    });

    it('dispatches request then acquired on success', async () => {
      const acquireEntryLockMock = vi.fn().mockResolvedValue({ ...lock, owner: { id: 'alice', name: 'Alice' } });
      currentBackend.mockReturnValue({
        supportsEntryLocking: () => true,
        acquireEntryLock: acquireEntryLockMock,
      } as any);
      const store = mockStore({ auth: { user: { login: 'alice', name: 'Alice' } } });

      await store.dispatch(acquireEntryLock(collection, 'my-post') as any);

      expect(acquireEntryLockMock).toHaveBeenCalledWith('posts/my-post', { id: 'alice', name: 'Alice' }, false);
      expect(store.getActions()).toEqual([
        { type: ENTRY_LOCK_REQUEST, payload: { collection: 'posts', slug: 'my-post' } },
        {
          type: ENTRY_LOCK_ACQUIRED,
          payload: { collection: 'posts', slug: 'my-post', lock: { ...lock, owner: { id: 'alice', name: 'Alice' } } },
        },
      ]);
    });

    it('dispatches conflict with the current holder when acquire is rejected', async () => {
      currentBackend.mockReturnValue({
        supportsEntryLocking: () => true,
        acquireEntryLock: vi.fn().mockRejectedValue(new Error('locked')),
        getEntryLock: vi.fn().mockResolvedValue(lock),
      } as any);
      const store = mockStore({ auth: { user: { login: 'alice', name: 'Alice' } } });

      await store.dispatch(acquireEntryLock(collection, 'my-post') as any);

      expect(store.getActions()).toEqual([
        { type: ENTRY_LOCK_REQUEST, payload: { collection: 'posts', slug: 'my-post' } },
        { type: ENTRY_LOCK_CONFLICT, payload: { collection: 'posts', slug: 'my-post', lock } },
      ]);
    });

    it('overrideEntryLock forces the acquire', async () => {
      const acquireEntryLockMock = vi.fn().mockResolvedValue(lock);
      currentBackend.mockReturnValue({
        supportsEntryLocking: () => true,
        acquireEntryLock: acquireEntryLockMock,
      } as any);
      const store = mockStore({ auth: { user: { login: 'alice', name: 'Alice' } } });

      await store.dispatch(overrideEntryLock(collection, 'my-post') as any);

      expect(acquireEntryLockMock).toHaveBeenCalledWith('posts/my-post', { id: 'alice', name: 'Alice' }, true);
    });
  });

  describe('releaseEntryLock', () => {
    it('releases and dispatches ENTRY_LOCK_RELEASED', async () => {
      const releaseEntryLockMock = vi.fn().mockResolvedValue(undefined);
      currentBackend.mockReturnValue({
        supportsEntryLocking: () => true,
        releaseEntryLock: releaseEntryLockMock,
      } as any);
      const store = mockStore({ auth: { user: { login: 'alice', name: 'Alice' } } });

      await store.dispatch(releaseEntryLock(collection, 'my-post') as any);

      expect(releaseEntryLockMock).toHaveBeenCalledWith('posts/my-post', { id: 'alice', name: 'Alice' });
      expect(store.getActions()).toEqual([
        { type: ENTRY_LOCK_RELEASED, payload: { collection: 'posts', slug: 'my-post' } },
      ]);
    });

    it('still dispatches ENTRY_LOCK_RELEASED when the network call fails', async () => {
      currentBackend.mockReturnValue({
        supportsEntryLocking: () => true,
        releaseEntryLock: vi.fn().mockRejectedValue(new Error('offline')),
      } as any);
      const store = mockStore({ auth: { user: { login: 'alice', name: 'Alice' } } });

      await store.dispatch(releaseEntryLock(collection, 'my-post') as any);

      expect(store.getActions()).toEqual([
        { type: ENTRY_LOCK_RELEASED, payload: { collection: 'posts', slug: 'my-post' } },
      ]);
    });
  });

  describe('refreshEntryLock', () => {
    it('is a no-op unless we currently believe we hold the lock', async () => {
      const refreshEntryLockMock = vi.fn();
      currentBackend.mockReturnValue({
        supportsEntryLocking: () => true,
        refreshEntryLock: refreshEntryLockMock,
      } as any);
      const store = mockStore({
        auth: { user: { login: 'alice', name: 'Alice' } },
        entryLock: {},
      });

      await store.dispatch(refreshEntryLock(collection, 'my-post') as any);

      expect(refreshEntryLockMock).not.toHaveBeenCalled();
      expect(store.getActions()).toEqual([]);
    });

    it('extends the lock and dispatches an updated ENTRY_LOCK_ACQUIRED', async () => {
      const renewed = { ...lock, owner: { id: 'alice', name: 'Alice' }, expiresAt: '2026-01-01T00:10:00.000Z' };
      currentBackend.mockReturnValue({
        supportsEntryLocking: () => true,
        refreshEntryLock: vi.fn().mockResolvedValue(renewed),
      } as any);
      const store = mockStore({
        auth: { user: { login: 'alice', name: 'Alice' } },
        entryLock: { 'posts.my-post': { status: 'locked-by-me', lock } },
      });

      await store.dispatch(refreshEntryLock(collection, 'my-post') as any);

      expect(store.getActions()).toEqual([
        { type: ENTRY_LOCK_ACQUIRED, payload: { collection: 'posts', slug: 'my-post', lock: renewed } },
      ]);
    });

    it('dispatches conflict when someone else force-took the lock mid-session', async () => {
      currentBackend.mockReturnValue({
        supportsEntryLocking: () => true,
        refreshEntryLock: vi.fn().mockRejectedValue(new Error('taken')),
        getEntryLock: vi.fn().mockResolvedValue(lock),
      } as any);
      const store = mockStore({
        auth: { user: { login: 'alice', name: 'Alice' } },
        entryLock: { 'posts.my-post': { status: 'locked-by-me', lock: { ...lock, owner: { id: 'alice', name: 'Alice' } } } },
      });

      await store.dispatch(refreshEntryLock(collection, 'my-post') as any);

      expect(store.getActions()).toEqual([
        { type: ENTRY_LOCK_CONFLICT, payload: { collection: 'posts', slug: 'my-post', lock } },
      ]);
    });
  });
});
