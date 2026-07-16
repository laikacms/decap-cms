import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionTag, entryTag, QueryCore } from '@/lib/util/queryCore';

describe('QueryCore', () => {
  let core: QueryCore;

  beforeEach(() => {
    vi.useFakeTimers();
    core = new QueryCore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares one promise between concurrent identical fetches', async () => {
    let resolve!: (value: string) => void;
    const fn = vi.fn(() => new Promise<string>(r => (resolve = r)));

    const first = core.fetch('k', fn);
    const second = core.fetch('k', fn);
    expect(core.isInFlight('k')).toBe(true);

    resolve('result');
    await expect(first).resolves.toBe('result');
    await expect(second).resolves.toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(core.isInFlight('k')).toBe(false);
  });

  it('marks a key fresh after success and stale after the ttl elapses', async () => {
    expect(core.freshness('k')).toBe('missing');

    await core.fetch('k', () => Promise.resolve(1), { ttl: 10_000 });
    expect(core.freshness('k')).toBe('fresh');

    vi.advanceTimersByTime(9_999);
    expect(core.isFresh('k')).toBe(true);

    vi.advanceTimersByTime(1);
    expect(core.freshness('k')).toBe('stale');
  });

  it('runs the fetcher again once the freshness window has passed', async () => {
    const fn = vi.fn(() => Promise.resolve(1));
    await core.fetch('k', fn, { ttl: 5_000 });
    await core.fetch('k', fn, { ttl: 5_000, keepValue: true });
    // Not in flight and not keepValue on first record, so the second call re-runs.
    expect(fn).toHaveBeenCalledTimes(2);

    const cached = vi.fn(() => Promise.resolve(2));
    await expect(core.fetch('k', cached, { keepValue: true })).resolves.toBe(1);
    expect(cached).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30_000);
    await expect(core.fetch('k', cached, { keepValue: true })).resolves.toBe(2);
    expect(cached).toHaveBeenCalledTimes(1);
  });

  it('clears freshness when the fetcher rejects so the next call retries', async () => {
    const failing = vi.fn(() => Promise.reject(new Error('boom')));
    await expect(core.fetch('k', failing)).rejects.toThrow('boom');
    expect(core.freshness('k')).toBe('missing');
    expect(core.isInFlight('k')).toBe(false);

    const succeeding = vi.fn(() => Promise.resolve('ok'));
    await expect(core.fetch('k', succeeding)).resolves.toBe('ok');
    expect(core.isFresh('k')).toBe(true);
  });

  it('shares the rejection between concurrent callers', async () => {
    let reject!: (err: Error) => void;
    const fn = vi.fn(() => new Promise<never>((_r, rej) => (reject = rej)));

    const first = core.fetch('k', fn);
    const second = core.fetch('k', fn);
    reject(new Error('boom'));

    await expect(first).rejects.toThrow('boom');
    await expect(second).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('invalidates all keys carrying an invalidated tag', async () => {
    await core.fetch('posts-list', () => Promise.resolve(1), { tags: [collectionTag('posts')] });
    await core.fetch('posts-entry', () => Promise.resolve(2), {
      tags: [collectionTag('posts'), entryTag('posts', 'hello')],
    });
    await core.fetch('pages-list', () => Promise.resolve(3), { tags: [collectionTag('pages')] });

    core.invalidateTags([collectionTag('posts')]);

    expect(core.freshness('posts-list')).toBe('missing');
    expect(core.freshness('posts-entry')).toBe('missing');
    expect(core.freshness('pages-list')).toBe('fresh');
  });

  it('returns retained values only while fresh', async () => {
    await core.fetch('k', () => Promise.resolve({ options: [1, 2] }), {
      ttl: 1_000,
      keepValue: true,
    });
    expect(core.getValue('k')).toEqual({ options: [1, 2] });

    vi.advanceTimersByTime(1_000);
    expect(core.getValue('k')).toBeUndefined();
  });

  it('clear() drops all state', async () => {
    await core.fetch('k', () => Promise.resolve(1), { keepValue: true });
    core.clear();
    expect(core.freshness('k')).toBe('missing');
    expect(core.getValue('k')).toBeUndefined();
  });
});
