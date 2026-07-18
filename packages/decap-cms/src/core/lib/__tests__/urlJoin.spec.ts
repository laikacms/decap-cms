import { describe, expect, it } from 'vitest';

import urlJoin from '@/core/lib/urlJoin';

describe('urlJoin', () => {
  describe('basic joining', () => {
    it('joins plain path segments with a single slash', () => {
      expect(urlJoin('a', 'b', 'c')).toBe('a/b/c');
    });

    it('joins a full URL with additional path segments', () => {
      expect(urlJoin('http://www.example.com', 'a', 'b')).toBe('http://www.example.com/a/b');
    });
  });

  describe('protocol normalization', () => {
    it('normalizes a protocol-only first segment ending in a single slash to a double slash', () => {
      expect(urlJoin('http:/', 'foo', 'bar')).toBe('http://foo/bar');
    });

    it('leaves an already-correct double-slash protocol untouched', () => {
      expect(urlJoin('http://', 'foo', 'bar')).toBe('http://foo/bar');
    });

    it('is idempotent when the protocol already includes the host in the first segment', () => {
      expect(urlJoin('http://www.example.com', 'a', 'b')).toBe('http://www.example.com/a/b');
    });
  });

  describe('leading-slash-only first segment', () => {
    it('combines a leading-slash-only first segment with the next part', () => {
      expect(urlJoin('/', 'foo', 'bar')).toBe('/foo/bar');
    });

    it('leaves a first segment that already includes a path untouched', () => {
      expect(urlJoin('/foo', 'bar')).toBe('/foo/bar');
    });
  });

  describe('file:// triple-slash handling', () => {
    it('preserves an already-correct triple-slash file protocol', () => {
      expect(urlJoin('file:///foo', 'bar')).toBe('file:///foo/bar');
    });

    it('does not upgrade a bare file:// protocol to a triple slash on its own', () => {
      expect(urlJoin('file://', 'foo', 'bar')).toBe('file://foo/bar');
    });

    it('normalizes a single-slash file protocol to a double slash like any other protocol', () => {
      expect(urlJoin('file:/', 'foo', 'bar')).toBe('file://foo/bar');
    });
  });

  describe('IPv6 host bracket detection', () => {
    it('does not mangle a bracketed IPv6 host used as the first segment', () => {
      expect(urlJoin('[2001:db8::1]', 'foo', 'bar')).toBe('[2001:db8::1]/foo/bar');
    });

    it('leaves a full URL with a bracketed IPv6 host and port untouched', () => {
      expect(urlJoin('http://[2001:db8::1]:8080', 'foo')).toBe('http://[2001:db8::1]:8080/foo');
    });
  });

  describe('duplicate-slash collapsing', () => {
    it('collapses duplicate slashes between segments', () => {
      expect(urlJoin('a', 'b//', '//c')).toBe('a/b/c');
    });

    it('collapses duplicate leading and trailing slashes across three segments', () => {
      expect(urlJoin('a///', '///b')).toBe('a/b');
    });

    it('collapses duplicate interior slashes when segments already carry single leading/trailing slashes', () => {
      expect(urlJoin('a', '/b', '/c')).toBe('a/b/c');
    });

    it('collapses duplicate slashes across many segments with surrounding trailing/leading slashes', () => {
      expect(urlJoin('http://example.com/', 'a/', '/b/', 'c')).toBe('http://example.com/a/b/c');
    });
  });

  describe('query-param and hash separator correctness', () => {
    it('joins a path segment with a query-param segment without a slash before the ?', () => {
      expect(urlJoin('http://example.com', 'a', '?foo=bar')).toBe('http://example.com/a?foo=bar');
    });

    it('drops the slash before a query param even when the previous segment already ends in one', () => {
      expect(urlJoin('http://example.com/', '?foo=bar')).toBe('http://example.com?foo=bar');
    });

    it('merges multiple query-param segments with & instead of duplicating the leading ?', () => {
      expect(urlJoin('http://example.com', 'foo?bar=baz', '?baz=qux')).toBe(
        'http://example.com/foo?bar=baz&baz=qux',
      );
    });

    it('joins a path segment with a hash segment without a slash before the #', () => {
      expect(urlJoin('http://example.com', 'a', '#hash')).toBe('http://example.com/a#hash');
    });

    it('drops the slash before a hash even when the previous segment already ends in one', () => {
      expect(urlJoin('http://example.com/', '#hash')).toBe('http://example.com#hash');
    });

    it('joins a path, a query param, and a hash together in the correct order', () => {
      expect(urlJoin('http://example.com', 'a', '?x=1', '#hash')).toBe(
        'http://example.com/a?x=1#hash',
      );
    });
  });

  describe('empty segments', () => {
    it('filters out empty string segments', () => {
      expect(urlJoin('http://example.com', '')).toBe('http://example.com');
    });
  });

  describe('non-string input', () => {
    it('throws a TypeError when the first argument is not a string', () => {
      expect(() => urlJoin(123 as unknown as string, 'a')).toThrow(TypeError);
    });

    it('throws a TypeError when called with only an empty string', () => {
      expect(() => urlJoin('')).toThrow(TypeError);
    });
  });
});
