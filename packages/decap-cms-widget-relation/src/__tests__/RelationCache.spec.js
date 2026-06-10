import relationCache from '../RelationCache';

beforeEach(() => {
  relationCache.clear();
});

describe('RelationCache.getOptions', () => {
  it('returns cached result on second call without calling queryFn again', async () => {
    const queryFn = jest.fn().mockResolvedValue(['option1', 'option2']);

    const first = await relationCache.getOptions('posts', ['title'], 'hello', null, queryFn);
    const second = await relationCache.getOptions('posts', ['title'], 'hello', null, queryFn);

    expect(first).toEqual(['option1', 'option2']);
    expect(second).toEqual(['option1', 'option2']);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('calls queryFn again for a different cache key', async () => {
    const queryFn = jest.fn().mockResolvedValue(['option1']);

    await relationCache.getOptions('posts', ['title'], 'hello', null, queryFn);
    await relationCache.getOptions('posts', ['title'], 'world', null, queryFn);

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent in-flight requests (two calls share one queryFn invocation)', async () => {
    let resolveQuery;
    const queryFn = jest.fn().mockReturnValue(
      new Promise(resolve => {
        resolveQuery = resolve;
      }),
    );

    const p1 = relationCache.getOptions('posts', ['title'], 'hello', null, queryFn);
    const p2 = relationCache.getOptions('posts', ['title'], 'hello', null, queryFn);

    expect(queryFn).toHaveBeenCalledTimes(1);

    resolveQuery(['shared-result']);

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual(['shared-result']);
    expect(r2).toEqual(['shared-result']);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('removes the pending request entry after resolution', async () => {
    const queryFn = jest.fn().mockResolvedValue(['done']);

    await relationCache.getOptions('posts', ['title'], 'test', null, queryFn);

    expect(relationCache.pendingRequests.size).toBe(0);
  });

  it('removes the pending request entry even when queryFn rejects', async () => {
    const queryFn = jest.fn().mockRejectedValue(new Error('network error'));

    await expect(
      relationCache.getOptions('posts', ['title'], 'fail', null, queryFn),
    ).rejects.toThrow('network error');

    expect(relationCache.pendingRequests.size).toBe(0);
  });
});

describe('RelationCache.ensureCacheSize', () => {
  it('evicts the oldest entry when cache exceeds 100 items', async () => {
    for (let i = 0; i < 100; i++) {
      const queryFn = jest.fn().mockResolvedValue([`result-${i}`]);
      // eslint-disable-next-line no-await-in-loop
      await relationCache.getOptions('col', ['f'], `term${i}`, null, queryFn);
    }

    expect(relationCache.cache.size).toBe(100);

    const oldestKey = relationCache.cache.keys().next().value;

    const queryFn101 = jest.fn().mockResolvedValue(['result-100']);
    await relationCache.getOptions('col', ['f'], 'term100', null, queryFn101);

    expect(relationCache.cache.size).toBe(100);
    expect(relationCache.cache.has(oldestKey)).toBe(false);
  });
});

describe('RelationCache.invalidateCollection', () => {
  it('removes all keys prefixed with <collection>- and leaves others intact', async () => {
    function makeQueryFn(result) {
      return jest.fn().mockResolvedValue(result);
    }

    await relationCache.getOptions('posts', ['title'], 'a', null, makeQueryFn([1]));
    await relationCache.getOptions('posts', ['title'], 'b', null, makeQueryFn([2]));
    await relationCache.getOptions('authors', ['name'], 'c', null, makeQueryFn([3]));

    expect(relationCache.cache.size).toBe(3);

    relationCache.invalidateCollection('posts');

    expect(relationCache.cache.size).toBe(1);
    const remainingKey = [...relationCache.cache.keys()][0];
    expect(remainingKey.startsWith('authors-')).toBe(true);
  });

  it('does not affect entries whose collection name is a prefix of another collection name', async () => {
    function makeQueryFn(result) {
      return jest.fn().mockResolvedValue(result);
    }

    await relationCache.getOptions('post', ['title'], 'a', null, makeQueryFn([1]));
    await relationCache.getOptions('posts', ['title'], 'a', null, makeQueryFn([2]));

    relationCache.invalidateCollection('post');

    expect(relationCache.cache.size).toBe(1);
    const remainingKey = [...relationCache.cache.keys()][0];
    expect(remainingKey.startsWith('posts-')).toBe(true);
  });
});

describe('RelationCache.clear', () => {
  it('empties both cache and pendingRequests maps', async () => {
    function makeQueryFn(result) {
      return jest.fn().mockResolvedValue(result);
    }

    await relationCache.getOptions('posts', ['title'], 'a', null, makeQueryFn([1]));

    relationCache.pendingRequests.set('fake-key', Promise.resolve(['pending']));

    expect(relationCache.cache.size).toBeGreaterThan(0);
    expect(relationCache.pendingRequests.size).toBeGreaterThan(0);

    relationCache.clear();

    expect(relationCache.cache.size).toBe(0);
    expect(relationCache.pendingRequests.size).toBe(0);
  });
});
