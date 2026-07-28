import { randomUUID } from './uuid.js';

import type { CmsEntryLock, CmsEntryLockOwner } from './types/cms/backend.js';

/**
 * A minimal key/value store the lock manager persists to. `localStorage`
 * (the default, see `createLocalStorageEntryLockManager`) makes locks
 * visible across every same-origin tab, which is what lets a plain browser
 * demo (no server) show "being edited by X" between two tabs of the same
 * dev-test instance. A plain in-memory `Map`-backed store works the same way
 * within a single tab/process — see `createInMemoryStore`.
 */
export interface EntryLockStore {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
  /** All keys currently stored — used to enumerate active locks. */
  keys: () => string[];
}

export function createInMemoryStore(): EntryLockStore {
  const map = new Map<string, string>();
  return {
    get: key => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    remove: key => {
      map.delete(key);
    },
    keys: () => Array.from(map.keys()),
  };
}

/**
 * `localStorage`-backed store, guarded for non-browser environments (SSR,
 * node test runners without a `localStorage` global) by falling back to an
 * in-memory store transparently.
 */
export function createLocalStorageStore(prefix: string): EntryLockStore {
  if (typeof localStorage === 'undefined') {
    return createInMemoryStore();
  }
  const keyOf = (key: string) => `${prefix}${key}`;
  return {
    get: key => localStorage.getItem(keyOf(key)),
    set: (key, value) => localStorage.setItem(keyOf(key), value),
    remove: key => localStorage.removeItem(keyOf(key)),
    keys: () => {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const storageKey = localStorage.key(i);
        if (storageKey && storageKey.startsWith(prefix)) {
          result.push(storageKey.slice(prefix.length));
        }
      }
      return result;
    },
  };
}

export const DEFAULT_ENTRY_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STORE_KEY_PREFIX = 'decap-cms.entry-lock.';

export class EntryLockConflictError extends Error {
  lock: CmsEntryLock;

  constructor(lock: CmsEntryLock) {
    super(`Entry "${lock.path}" is locked by ${lock.owner.name}`);
    this.name = 'EntryLockConflictError';
    this.lock = lock;
  }
}

/**
 * A reusable advisory-lock state machine: acquire/release/refresh/list,
 * TTL-based stale expiry, and force-override. Backend implementations wire
 * this into the four optional `CmsImplementation` lock methods
 * (`getEntryLock`/`acquireEntryLock`/`releaseEntryLock`/`refreshEntryLock`)
 * — see `src/backends/test/implementation.tsx` for the reference wiring.
 *
 * This is a *local* reference implementation: it arbitrates locks against
 * whatever `store` it's given (in-memory or `localStorage`), not a server.
 * A real multi-user deployment needs a backend whose lock methods call out
 * to server-side state instead (the store here is just the default) so two
 * different *browsers* — not only two tabs of the same one — see the same
 * lock.
 */
export class EntryLockManager {
  private store: EntryLockStore;
  private ttlMs: number;
  private now: () => number;

  constructor(options: { store?: EntryLockStore, ttlMs?: number, now?: () => number } = {}) {
    this.store = options.store ?? createLocalStorageStore(STORE_KEY_PREFIX);
    this.ttlMs = options.ttlMs ?? DEFAULT_ENTRY_LOCK_TTL_MS;
    this.now = options.now ?? (() => Date.now());
  }

  private read(path: string): CmsEntryLock | null {
    const raw = this.store.get(path);
    if (!raw) return null;
    try {
      const lock = JSON.parse(raw) as CmsEntryLock;
      if (new Date(lock.expiresAt).getTime() <= this.now()) {
        // Stale: treat as absent, and clean it up so `keys()`/listings don't
        // keep reporting a dead lock indefinitely.
        this.store.remove(path);
        return null;
      }
      return lock;
    } catch {
      // Corrupt/foreign value under our key prefix — treat as unlocked
      // rather than throwing.
      this.store.remove(path);
      return null;
    }
  }

  private write(lock: CmsEntryLock): CmsEntryLock {
    this.store.set(lock.path, JSON.stringify(lock));
    return lock;
  }

  async get(path: string): Promise<CmsEntryLock | null> {
    return this.read(path);
  }

  /** All currently non-expired locks this manager's store knows about. */
  async list(): Promise<CmsEntryLock[]> {
    const locks: CmsEntryLock[] = [];
    for (const key of this.store.keys()) {
      const lock = this.read(key);
      if (lock) locks.push(lock);
    }
    return locks;
  }

  async acquire(
    path: string,
    owner: CmsEntryLockOwner,
    opts: { force?: boolean } = {},
  ): Promise<CmsEntryLock> {
    const existing = this.read(path);
    if (existing && existing.owner.id !== owner.id && !opts.force) {
      throw new EntryLockConflictError(existing);
    }
    const acquiredAt = new Date(this.now());
    const expiresAt = new Date(acquiredAt.getTime() + this.ttlMs);
    return this.write({
      path,
      owner,
      acquiredAt: acquiredAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  async refresh(path: string, owner: CmsEntryLockOwner): Promise<CmsEntryLock> {
    const existing = this.read(path);
    // A refresh from a holder whose lock already expired (or was taken over
    // by someone else) is just a fresh acquire attempt — not an error, so a
    // tab that briefly lost focus/network can silently reclaim an unlocked
    // entry instead of hard-failing the periodic refresh timer.
    if (!existing || existing.owner.id === owner.id) {
      return this.acquire(path, owner);
    }
    throw new EntryLockConflictError(existing);
  }

  async release(path: string, owner: CmsEntryLockOwner): Promise<void> {
    const existing = this.read(path);
    // Only the current holder can release — a delayed release from a tab
    // that lost a force-override race must not evict the new holder.
    if (existing && existing.owner.id !== owner.id) return;
    this.store.remove(path);
  }
}

/** A stable per-browser-tab id, used as a fallback lock owner id when the app has no signed-in user identity handy. */
export function createAnonymousLockOwnerId(): string {
  return randomUUID();
}
