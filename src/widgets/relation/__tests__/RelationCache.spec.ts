import { afterEach, describe, expect, it, vi } from 'vitest';

import relationCache from '@/widgets/relation/RelationCache';

afterEach(() => {
  relationCache.clear();
});

describe('RelationCache', () => {
  it('caches getOptions results per (collection, searchFields, term, file) key', async () => {
    const queryFn = vi.fn().mockResolvedValue(['first']);

    const first = await relationCache.getOptions('posts', ['title'], 'foo', undefined, queryFn);
    const second = await relationCache.getOptions('posts', ['title'], 'foo', undefined, queryFn);

    expect(first).toEqual(['first']);
    expect(second).toEqual(['first']);
    // Pinning the current (undesirable) staleness behavior: a second query
    // for the same key never re-runs queryFn, even if the underlying
    // collection data has since changed - unless invalidateCollection() is
    // called first (DCMS-606).
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('invalidateCollection() forces the next getOptions call for that collection to re-query', async () => {
    const queryFn = vi.fn().mockResolvedValueOnce(['stale']).mockResolvedValueOnce(['fresh']);

    const before = await relationCache.getOptions('posts', ['title'], 'foo', undefined, queryFn);
    expect(before).toEqual(['stale']);

    relationCache.invalidateCollection('posts');

    const after = await relationCache.getOptions('posts', ['title'], 'foo', undefined, queryFn);
    expect(after).toEqual(['fresh']);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('invalidateCollection() only clears entries for the given collection', async () => {
    const postsQueryFn = vi.fn().mockResolvedValue(['posts-result']);
    const authorsQueryFn = vi.fn().mockResolvedValue(['authors-result']);

    await relationCache.getOptions('posts', ['title'], 'foo', undefined, postsQueryFn);
    await relationCache.getOptions('authors', ['name'], 'foo', undefined, authorsQueryFn);

    relationCache.invalidateCollection('posts');

    await relationCache.getOptions('posts', ['title'], 'foo', undefined, postsQueryFn);
    await relationCache.getOptions('authors', ['name'], 'foo', undefined, authorsQueryFn);

    expect(postsQueryFn).toHaveBeenCalledTimes(2);
    expect(authorsQueryFn).toHaveBeenCalledTimes(1);
  });
});
