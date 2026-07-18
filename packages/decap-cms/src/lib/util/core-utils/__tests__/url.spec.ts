import { describe, expect, it } from 'vitest';

import { combine, isAbsolute, join, normalize } from '@/lib/util/core-utils/url.js';

describe('isAbsolute', () => {
  it('should return true for URLs with a scheme', () => {
    expect(isAbsolute('https://example.com')).toBe(true);
    expect(isAbsolute('http://example.com/path')).toBe(true);
    expect(isAbsolute('custom-scheme+v1.0:path')).toBe(true);
  });

  it('should return false for relative paths', () => {
    expect(isAbsolute('/path/to/resource')).toBe(false);
    expect(isAbsolute('path/to/resource')).toBe(false);
  });

  it('should return false for a scheme-like prefix that starts with a digit', () => {
    expect(isAbsolute('1scheme:path')).toBe(false);
  });

  it('should return false for nullish or non-string input', () => {
    expect(isAbsolute(undefined)).toBe(false);
    expect(isAbsolute(null)).toBe(false);
    expect(isAbsolute('')).toBe(false);
  });
});

describe('normalize', () => {
  it('should strip a single trailing slash', () => {
    expect(normalize('/foo/bar/')).toBe('/foo/bar');
  });

  it('should prefix relative paths with a leading slash', () => {
    expect(normalize('foo/bar')).toBe('/foo/bar');
  });

  it('should leave already-rooted paths untouched aside from trailing slash removal', () => {
    expect(normalize('/foo/bar')).toBe('/foo/bar');
  });

  it('should leave absolute URLs untouched other than trailing slash removal', () => {
    expect(normalize('https://example.com/foo/')).toBe('https://example.com/foo');
    expect(normalize('https://example.com')).toBe('https://example.com');
  });

  it('should pass empty string through unchanged', () => {
    expect(normalize('')).toBe('');
  });

  it('should pass nullish input through unchanged rather than coercing to an empty string', () => {
    expect(normalize(undefined)).toBeUndefined();
    expect(normalize(null)).toBeNull();
  });
});

describe('join', () => {
  it('should join two relative paths', () => {
    expect(join('/foo', '/bar')).toBe('/foo/bar');
  });

  it('should normalize trailing slashes before joining', () => {
    expect(join('/foo/', '/bar/')).toBe('/foo/bar');
  });

  it('should prefix bare segments with a leading slash before joining', () => {
    expect(join('foo', 'bar')).toBe('/foo/bar');
  });

  it('should return the second URL as-is when it is absolute, discarding the first URL entirely', () => {
    expect(join('/foo/bar/baz', 'https://example.com/bar')).toBe('https://example.com/bar');
  });

  it('should return the first URL when the second is empty or nullish', () => {
    expect(join('/foo', '')).toBe('/foo');
    expect(join('/foo', undefined)).toBe('/foo');
    expect(join('/foo', null)).toBe('/foo');
  });

  it('should return the normalized second URL when the first is empty or nullish', () => {
    expect(join('', '/bar')).toBe('/bar');
    expect(join(undefined, 'bar')).toBe('/bar');
    expect(join(null, 'https://example.com')).toBe('https://example.com');
  });

  it('should return an empty string when both URLs are empty or nullish', () => {
    expect(join(null, null)).toBe('');
    expect(join(undefined, undefined)).toBe('');
    expect(join('', '')).toBe('');
  });
});

describe('combine', () => {
  it('should combine multiple relative segments into one path', () => {
    expect(combine('foo', 'bar', 'baz')).toBe('/foo/bar/baz');
  });

  it('should skip empty and nullish segments', () => {
    expect(combine('', 'foo', undefined, 'bar', null)).toBe('/foo/bar');
  });

  it('should reset everything accumulated so far when an absolute URL appears mid-list', () => {
    expect(combine('foo', 'https://example.com/bar', 'baz')).toBe('https://example.com/bar/baz');
  });

  it('should keep only the last absolute URL when multiple appear in the list', () => {
    expect(
      combine('foo', 'https://example.com/bar', 'https://other.example.com/baz', 'qux'),
    ).toBe('https://other.example.com/baz/qux');
  });

  it('should return an empty string when called with no segments', () => {
    expect(combine()).toBe('');
  });

  it('should return an empty string when all segments are empty or nullish', () => {
    expect(combine('', undefined, null)).toBe('');
  });
});
