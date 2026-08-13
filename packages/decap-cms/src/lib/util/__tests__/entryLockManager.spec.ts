import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createInMemoryStore,
  createLocalStorageStore,
  EntryLockConflictError,
  EntryLockManager,
} from '@/lib/util/entryLockManager.js';

const alice = { id: 'alice', name: 'Alice' };
const bob = { id: 'bob', name: 'Bob' };

function createManager(overrides: { ttlMs?: number, now?: () => number } = {}) {
  let now = overrides.now ?? (() => 0);
  const manager = new EntryLockManager({
    store: createInMemoryStore(),
    ttlMs: overrides.ttlMs ?? 60_000,
    now: () => now(),
  });
  return { manager, setNow: (fn: () => number) => (now = fn) };
}

describe('EntryLockManager', () => {
  it('is unlocked for a path nobody has touched', async () => {
    const { manager } = createManager();
    await expect(manager.get('posts/a.json')).resolves.toBeNull();
  });

  it('acquires a free lock', async () => {
    const { manager } = createManager();
    const lock = await manager.acquire('posts/a.json', alice);
    expect(lock.owner).toEqual(alice);
    await expect(manager.get('posts/a.json')).resolves.toEqual(lock);
  });

  it('lets the same owner re-acquire (idempotent) without conflict', async () => {
    const { manager } = createManager();
    await manager.acquire('posts/a.json', alice);
    await expect(manager.acquire('posts/a.json', alice)).resolves.toMatchObject({ owner: alice });
  });

  it('rejects a second owner acquiring a held lock', async () => {
    const { manager } = createManager();
    await manager.acquire('posts/a.json', alice);
    await expect(manager.acquire('posts/a.json', bob)).rejects.toBeInstanceOf(EntryLockConflictError);
  });

  it('lets a second owner force-override a held lock', async () => {
    const { manager } = createManager();
    await manager.acquire('posts/a.json', alice);
    const lock = await manager.acquire('posts/a.json', bob, { force: true });
    expect(lock.owner).toEqual(bob);
    await expect(manager.get('posts/a.json')).resolves.toMatchObject({ owner: bob });
  });

  it('releases only when the caller is the current holder', async () => {
    const { manager } = createManager();
    await manager.acquire('posts/a.json', alice);
    // Bob was never the holder — releasing under his identity is a no-op,
    // not an error, and must not evict Alice's lock.
    await manager.release('posts/a.json', bob);
    await expect(manager.get('posts/a.json')).resolves.toMatchObject({ owner: alice });

    await manager.release('posts/a.json', alice);
    await expect(manager.get('posts/a.json')).resolves.toBeNull();
  });

  it('treats an expired lock as free (stale-lock expiry)', async () => {
    const { manager, setNow } = createManager({ ttlMs: 1000 });
    setNow(() => 0);
    await manager.acquire('posts/a.json', alice);

    setNow(() => 999);
    await expect(manager.get('posts/a.json')).resolves.toMatchObject({ owner: alice });

    setNow(() => 1001);
    await expect(manager.get('posts/a.json')).resolves.toBeNull();
    // A fresh acquire by a different owner succeeds once the old one expired.
    await expect(manager.acquire('posts/a.json', bob)).resolves.toMatchObject({ owner: bob });
  });

  it('refresh extends the TTL for the current holder', async () => {
    const { manager, setNow } = createManager({ ttlMs: 1000 });
    setNow(() => 0);
    await manager.acquire('posts/a.json', alice);

    setNow(() => 900);
    await manager.refresh('posts/a.json', alice);

    // Without the refresh this would have expired at t=1000.
    setNow(() => 1500);
    await expect(manager.get('posts/a.json')).resolves.toMatchObject({ owner: alice });
  });

  it('refresh rejects when a different, still-live owner holds the lock', async () => {
    const { manager } = createManager();
    await manager.acquire('posts/a.json', alice);
    await expect(manager.refresh('posts/a.json', bob)).rejects.toBeInstanceOf(EntryLockConflictError);
  });

  it('refresh re-acquires for the caller once the previous lock expired', async () => {
    const { manager, setNow } = createManager({ ttlMs: 1000 });
    setNow(() => 0);
    await manager.acquire('posts/a.json', alice);

    setNow(() => 2000);
    const lock = await manager.refresh('posts/a.json', bob);
    expect(lock.owner).toEqual(bob);
  });

  it('lists only currently active locks', async () => {
    const { manager, setNow } = createManager({ ttlMs: 1000 });
    setNow(() => 0);
    await manager.acquire('posts/a.json', alice);
    await manager.acquire('posts/b.json', bob);

    setNow(() => 500);
    await expect(manager.list()).resolves.toHaveLength(2);

    // a.json is untouched and expires; b.json gets refreshed and survives.
    await manager.refresh('posts/b.json', bob);
    setNow(() => 1499);
    const active = await manager.list();
    expect(active).toHaveLength(1);
    expect(active[0].path).toBe('posts/b.json');
  });
});

describe('createLocalStorageStore', () => {
  const prefix = 'decap-cms.entry-lock.';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('round-trips get/set/remove through localStorage under the given prefix', () => {
    const store = createLocalStorageStore(prefix);

    expect(store.get('posts/hello-world.md')).toBeNull();

    store.set('posts/hello-world.md', 'lock-payload');

    // The value is actually written to the real localStorage under the
    // prefixed key, not just held in memory by the store instance.
    expect(localStorage.getItem(`${prefix}posts/hello-world.md`)).toBe('lock-payload');
    expect(store.get('posts/hello-world.md')).toBe('lock-payload');

    store.set('posts/hello-world.md', 'updated-payload');
    expect(store.get('posts/hello-world.md')).toBe('updated-payload');

    store.remove('posts/hello-world.md');
    expect(store.get('posts/hello-world.md')).toBeNull();
    expect(localStorage.getItem(`${prefix}posts/hello-world.md`)).toBeNull();
  });

  it('keys() returns only prefixed keys with the prefix stripped, ignoring unrelated entries', () => {
    const store = createLocalStorageStore(prefix);

    store.set('posts/a.md', 'lock-a');
    store.set('posts/b.md', 'lock-b');
    // Unrelated localStorage entries (written by other app code / other
    // stores) must not leak into this store's key listing.
    localStorage.setItem('some-other-app-key', 'unrelated');
    localStorage.setItem('decap-cms.other-namespace.thing', 'also-unrelated');

    const keys = store.keys();

    expect(keys.sort()).toEqual(['posts/a.md', 'posts/b.md']);
  });

  it('keys() reflects removals', () => {
    const store = createLocalStorageStore(prefix);

    store.set('posts/a.md', 'lock-a');
    store.set('posts/b.md', 'lock-b');
    store.remove('posts/a.md');

    expect(store.keys()).toEqual(['posts/b.md']);
  });

  it('falls back to an in-memory store when localStorage is undefined (SSR)', () => {
    const originalLocalStorage = globalThis.localStorage;
    // Simulate an SSR / non-browser environment where the `localStorage`
    // global is not defined at all.
    // @ts-expect-error -- intentionally deleting a required global to
    // exercise the SSR fallback branch.
    delete globalThis.localStorage;

    try {
      expect(typeof globalThis.localStorage).toBe('undefined');

      const store = createLocalStorageStore(prefix);

      expect(store.get('posts/hello-world.md')).toBeNull();
      store.set('posts/hello-world.md', 'lock-payload');
      expect(store.get('posts/hello-world.md')).toBe('lock-payload');
      expect(store.keys()).toEqual(['posts/hello-world.md']);

      store.remove('posts/hello-world.md');
      expect(store.get('posts/hello-world.md')).toBeNull();
      expect(store.keys()).toEqual([]);
    } finally {
      globalThis.localStorage = originalLocalStorage;
    }
  });

  it('in-memory fallback instances do not share state with each other or with real localStorage', () => {
    const originalLocalStorage = globalThis.localStorage;
    // @ts-expect-error -- intentionally deleting a required global to
    // exercise the SSR fallback branch.
    delete globalThis.localStorage;

    try {
      const storeA = createLocalStorageStore(prefix);
      const storeB = createLocalStorageStore(prefix);

      storeA.set('posts/a.md', 'lock-a');

      expect(storeB.get('posts/a.md')).toBeNull();
    } finally {
      globalThis.localStorage = originalLocalStorage;
    }
  });
});
