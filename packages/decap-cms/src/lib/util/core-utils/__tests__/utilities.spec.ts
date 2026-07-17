import { describe, expect, it, vi } from 'vitest';

import { lazy, lazyAsync, memoizeOne, Paths, Url } from '@/lib/util/core-utils/utilities.js';

describe('lazy', () => {
  it('should compute the value on first call', () => {
    const func = vi.fn(() => 42);
    const getValue = lazy(func);

    expect(getValue()).toBe(42);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should cache the result and not recompute on repeat calls', () => {
    const func = vi.fn(() => ({ id: 1 }));
    const getValue = lazy(func);

    const first = getValue();
    const second = getValue();
    const third = getValue();

    expect(func).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('should keep separate caches for separate lazy instances', () => {
    let calls = 0;
    const factory = () => {
      calls += 1;
      return calls;
    };
    const getA = lazy(factory);
    const getB = lazy(factory);

    expect(getA()).toBe(1);
    expect(getB()).toBe(2);
    expect(getA()).toBe(1);
    expect(getB()).toBe(2);
  });
});

describe('lazyAsync', () => {
  it('should compute the value on first call', async () => {
    const func = vi.fn(async () => 'hello');
    const getValue = lazyAsync(func);

    await expect(getValue()).resolves.toBe('hello');
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should cache the resolved result across repeat calls', async () => {
    const func = vi.fn(async () => ({ id: 1 }));
    const getValue = lazyAsync(func);

    const first = await getValue();
    const second = await getValue();
    const third = await getValue();

    expect(func).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('should not guard against a race: concurrent calls before the first resolves both invoke func', async () => {
    // instance is only assigned after the first call's await completes, so overlapping
    // calls made before that happens each see a falsy instance and invoke func again.
    const func = vi.fn(async () => 'value');
    const getValue = lazyAsync(func);

    const [first, second] = await Promise.all([getValue(), getValue()]);

    expect(first).toBe('value');
    expect(second).toBe('value');
    expect(func).toHaveBeenCalledTimes(2);
  });
});

describe('memoizeOne', () => {
  it('should return the cached output for the same input', () => {
    const func = vi.fn((x: number) => x * 2);
    const memoized = memoizeOne(func);

    expect(memoized(2)).toBe(4);
    expect(memoized(2)).toBe(4);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should recompute when called with a different input', () => {
    const func = vi.fn((x: number) => x * 2);
    const memoized = memoizeOne(func);

    expect(memoized(2)).toBe(4);
    expect(memoized(3)).toBe(6);
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should only retain a single cache entry, recomputing when the input reverts', () => {
    const func = vi.fn((x: number) => x * 2);
    const memoized = memoizeOne(func);

    memoized(1);
    memoized(2);
    memoized(1);

    expect(func).toHaveBeenCalledTimes(3);
  });

  it('should use strict equality (===) to compare inputs', () => {
    const func = vi.fn((x: { id: number }) => x.id);
    const memoized = memoizeOne(func);

    const arg = { id: 1 };
    memoized(arg);
    memoized({ id: 1 });

    expect(func).toHaveBeenCalledTimes(2);
  });
});

describe('Url', () => {
  describe('isAbsolute', () => {
    it('should return true for URLs with a scheme', () => {
      expect(Url.isAbsolute('https://example.com')).toBe(true);
      expect(Url.isAbsolute('http://example.com/path')).toBe(true);
      expect(Url.isAbsolute('custom-scheme+v1.0:path')).toBe(true);
    });

    it('should return false for relative paths', () => {
      expect(Url.isAbsolute('/path/to/resource')).toBe(false);
      expect(Url.isAbsolute('path/to/resource')).toBe(false);
    });

    it('should return false for nullish or non-string input', () => {
      expect(Url.isAbsolute(undefined)).toBe(false);
      expect(Url.isAbsolute(null)).toBe(false);
      expect(Url.isAbsolute('')).toBe(false);
    });
  });

  describe('normalize', () => {
    it('should strip a single trailing slash', () => {
      expect(Url.normalize('/foo/bar/')).toBe('/foo/bar');
    });

    it('should prefix relative paths with a leading slash', () => {
      expect(Url.normalize('foo/bar')).toBe('/foo/bar');
    });

    it('should leave already-rooted paths untouched (aside from trailing slash)', () => {
      expect(Url.normalize('/foo/bar')).toBe('/foo/bar');
    });

    it('should leave absolute URLs untouched other than trailing slash removal', () => {
      expect(Url.normalize('https://example.com/foo/')).toBe('https://example.com/foo');
      expect(Url.normalize('https://example.com')).toBe('https://example.com');
    });

    it('should pass through empty and nullish input unchanged', () => {
      expect(Url.normalize('')).toBe('');
      expect(Url.normalize(undefined)).toBeUndefined();
      expect(Url.normalize(null)).toBeNull();
    });
  });

  describe('join', () => {
    it('should join two relative paths', () => {
      expect(Url.join('/foo', '/bar')).toBe('/foo/bar');
    });

    it('should normalize trailing slashes before joining', () => {
      expect(Url.join('/foo/', '/bar/')).toBe('/foo/bar');
    });

    it('should return the second URL as-is when it is absolute', () => {
      expect(Url.join('/foo', 'https://example.com/bar')).toBe('https://example.com/bar');
    });

    it('should return the first URL when the second is empty or nullish', () => {
      expect(Url.join('/foo', '')).toBe('/foo');
      expect(Url.join('/foo', undefined)).toBe('/foo');
      expect(Url.join('/foo', null)).toBe('/foo');
    });

    it('should return the (normalized) second URL when the first is empty or nullish', () => {
      expect(Url.join('', '/bar')).toBe('/bar');
      expect(Url.join(undefined, 'bar')).toBe('/bar');
      expect(Url.join(null, null)).toBe('');
    });
  });

  describe('combine', () => {
    it('should combine multiple relative segments into one path', () => {
      expect(Url.combine('foo', 'bar', 'baz')).toBe('/foo/bar/baz');
    });

    it('should stop combining once an absolute segment is encountered', () => {
      expect(Url.combine('foo', 'https://example.com/bar', 'baz')).toBe(
        'https://example.com/bar/baz',
      );
    });

    it('should skip empty and nullish segments', () => {
      expect(Url.combine('', 'foo', undefined, 'bar', null)).toBe('/foo/bar');
    });

    it('should return an empty string when called with no segments', () => {
      expect(Url.combine()).toBe('');
    });
  });
});

describe('Paths', () => {
  describe('pathToSegments', () => {
    it('should split a path into trimmed segments', () => {
      expect(Paths.pathToSegments('foo/bar/baz')).toEqual(['foo', 'bar', 'baz']);
    });

    it('should drop empty segments from leading, trailing, and repeated slashes', () => {
      expect(Paths.pathToSegments('/foo//bar/')).toEqual(['foo', 'bar']);
    });

    it('should trim whitespace within segments', () => {
      expect(Paths.pathToSegments(' foo / bar ')).toEqual(['foo', 'bar']);
    });

    it('should return an empty array for an empty path', () => {
      expect(Paths.pathToSegments('')).toEqual([]);
    });
  });

  describe('toSegments', () => {
    it('should behave identically to pathToSegments', () => {
      expect(Paths.toSegments('/foo/bar/')).toEqual(Paths.pathToSegments('/foo/bar/'));
    });
  });

  describe('combine', () => {
    it('should join segments with a single slash', () => {
      expect(Paths.combine('foo', 'bar', 'baz')).toBe('foo/bar/baz');
    });

    it('should trim whitespace from each segment', () => {
      expect(Paths.combine(' foo ', ' bar ')).toBe('foo/bar');
    });

    it('should drop empty and whitespace-only segments', () => {
      expect(Paths.combine('foo', '', '   ', 'bar')).toBe('foo/bar');
    });

    it('should return an empty string when called with no segments', () => {
      expect(Paths.combine()).toBe('');
    });
  });
});
