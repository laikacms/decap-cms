import { describe, expect, it } from 'vitest';

import {
  createInMemoryStore,
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
