import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFreshnessController, matchCollectionsByPath } from '@/core/lib/freshness';
import queryCore, { collectionTag } from '@/lib/util/queryCore';

import type { Backend } from '@/core/backend';

function fakeBackend(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    supportsContentSync: () => true,
    supportsChangeFeed: () => false,
    getSyncToken: vi.fn(async () => 'token-1'),
    getChanges: vi.fn(async () => null),
    ...overrides,
  } as unknown as Backend;
}

function fakeState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    auth: { user: { name: 'test' } },
    config: { publish_mode: 'simple' },
    collections: {
      posts: { name: 'posts', folder: 'content/posts' },
      pages: { name: 'pages', folder: 'content/pages' },
    },
    entries: { entities: {}, pages: { posts: { isFetching: false, ids: [] } } },
    ...overrides,
  };
}

describe('createFreshnessController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    queryCore.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing before a user is authenticated', async () => {
    const backend = fakeBackend();
    const dispatch = vi.fn();
    const controller = createFreshnessController({
      getState: () => fakeState({ auth: { user: null } }),
      dispatch,
      getBackend: () => backend,
    });

    await controller.tick();
    expect(backend.getSyncToken).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('stops polling permanently when the backend has no sync surface', async () => {
    const backend = fakeBackend({ supportsContentSync: () => false });
    const controller = createFreshnessController({
      getState: () => fakeState(),
      dispatch: vi.fn(),
      getBackend: () => backend,
    });

    await controller.tick();
    await controller.tick();
    expect(backend.getSyncToken).not.toHaveBeenCalled();
  });

  it('treats the first token as a baseline and refreshes loaded collections on change', async () => {
    const tokens = ['token-1', 'token-1', 'token-2'];
    const backend = fakeBackend({
      getSyncToken: vi.fn(async () => tokens.shift() ?? 'token-2'),
    });
    const dispatch = vi.fn();
    const state = fakeState();
    const controller = createFreshnessController({
      getState: () => state,
      dispatch,
      getBackend: () => backend,
    });

    await controller.tick(); // baseline
    await controller.tick(); // unchanged
    expect(dispatch).not.toHaveBeenCalled();

    await queryCore.fetch('entries/posts/0', () => Promise.resolve(1), {
      tags: [collectionTag('posts')],
    });
    expect(queryCore.isFresh('entries/posts/0')).toBe(true);

    await controller.tick(); // token changed
    // Loaded collection refreshed (posts has a pages entry; pages does not).
    expect(dispatch).toHaveBeenCalledTimes(1);
    // Without a change feed, invalidation is coarse: the collection went stale.
    expect(queryCore.isFresh('entries/posts/0')).toBe(false);
  });

  it('uses the change feed to invalidate only affected collections', async () => {
    const tokens = ['token-1', 'token-2'];
    const backend = fakeBackend({
      supportsChangeFeed: () => true,
      getSyncToken: vi.fn(async () => tokens.shift() ?? 'token-2'),
      getChanges: vi.fn(async () => ({
        changes: [{ path: 'content/posts/hello.md', deleted: false }],
        token: 'token-2',
      })),
    });
    const dispatch = vi.fn();
    const controller = createFreshnessController({
      getState: () => fakeState(),
      dispatch,
      getBackend: () => backend,
    });

    await queryCore.fetch('entries/posts/0', () => Promise.resolve(1), {
      tags: [collectionTag('posts')],
    });
    await queryCore.fetch('entries/pages/0', () => Promise.resolve(1), {
      tags: [collectionTag('pages')],
    });

    await controller.tick(); // baseline
    await controller.tick(); // change detected

    expect(backend.getChanges).toHaveBeenCalledWith('token-1');
    expect(queryCore.isFresh('entries/posts/0')).toBe(false);
    expect(queryCore.isFresh('entries/pages/0')).toBe(true);
  });
});

describe('matchCollectionsByPath', () => {
  const collections = {
    posts: { name: 'posts', folder: 'content/posts' },
    settings: { name: 'settings', files: [{ file: 'data/settings.yml' }] },
  };

  it('matches folder collections by prefix and files collections exactly', () => {
    const result = matchCollectionsByPath(collections, [
      'content/posts/a.md',
      'data/settings.yml',
    ]);
    expect(result.collections).toEqual(new Set(['posts', 'settings']));
    expect(result.unmatched).toBe(false);
  });

  it('reports paths that belong to no collection', () => {
    const result = matchCollectionsByPath(collections, ['static/img/logo.png']);
    expect(result.collections.size).toBe(0);
    expect(result.unmatched).toBe(true);
  });
});
