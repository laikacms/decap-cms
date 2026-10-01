import { describe, expect, it } from 'vitest';

import {
  addParams,
  getCharReplacer,
  getCollectionUrl,
  getNewEntryUrl,
  joinUrlPath,
  sanitizeChar,
  sanitizeSlug,
  sanitizeURI,
  stripProtocol,
} from '@/core/lib/urlHelper';

describe('sanitizeURI', () => {
  // `sanitizeURI` tests from RFC 3987
  it('should keep valid URI chars (letters digits _ - . ~)', () => {
    expect(sanitizeURI('This, that-one_or.the~other 123!')).toEqual('Thisthat-one_or.the~other123');
  });

  it('should not remove accents', () => {
    expect(sanitizeURI('ěščřžý')).toEqual('ěščřžý');
  });

  it('should keep valid non-latin chars (ucschars in RFC 3987)', () => {
    expect(sanitizeURI('日本語のタイトル')).toEqual('日本語のタイトル');
  });

  it('should not keep valid non-latin chars (ucschars in RFC 3987) if set to ASCII mode', () => {
    expect(sanitizeURI('ěščřžý日本語のタイトル', { encoding: 'ascii' })).toEqual('');
  });

  it('should not normalize Unicode strings', () => {
    expect(sanitizeURI('\u017F\u0323\u0307')).toEqual('\u017F\u0323\u0307');
    expect(sanitizeURI('\u017F\u0323\u0307')).not.toEqual('\u1E9B\u0323');
  });

  it('should allow a custom replacement character', () => {
    expect(sanitizeURI('duck\\goose.elephant', { replacement: '-' })).toEqual(
      'duck-goose.elephant',
    );
  });

  it('should not allow an improper replacement character', () => {
    expect(() => {
      sanitizeURI('I! like! dollars!', { replacement: '$' });
    }).toThrow();
  });

  it('should not actually URI-encode the characters', () => {
    expect(sanitizeURI('🎉')).toEqual('🎉');
    expect(sanitizeURI('🎉')).not.toEqual('%F0%9F%8E%89');
  });

  it('throws for an invalid `encoding` option', () => {
    expect(() => sanitizeURI('test', { encoding: 'latin1' })).toThrowError(
      '`options.encoding` must be "unicode" or "ascii".',
    );
  });
});

const slugConfig = {
  encoding: 'unicode',
  clean_accents: false,
  sanitize_replacement: '-',
};

describe('sanitizeSlug', () => {
  it('throws an error for non-strings', () => {
    expect(() => sanitizeSlug({})).toThrowError('The input slug must be a string.');
    expect(() => sanitizeSlug([])).toThrowError('The input slug must be a string.');
    expect(() => sanitizeSlug(false)).toThrowError('The input slug must be a string.');
    expect(() => sanitizeSlug(null)).toThrowError('The input slug must be a string.');
    expect(() => sanitizeSlug(11234)).toThrowError('The input slug must be a string.');
    expect(() => sanitizeSlug(undefined)).toThrowError('The input slug must be a string.');
    expect(() => sanitizeSlug(() => {})).toThrowError('The input slug must be a string.');
  });

  it('throws an error for non-string replacements', () => {
    expect(() => sanitizeSlug('test', { sanitize_replacement: {} })).toThrowError(
      '`options.replacement` must be a string.',
    );
    expect(() => sanitizeSlug('test', { sanitize_replacement: [] })).toThrowError(
      '`options.replacement` must be a string.',
    );
    expect(() => sanitizeSlug('test', { sanitize_replacement: false })).toThrowError(
      '`options.replacement` must be a string.',
    );
    expect(() => sanitizeSlug('test', { sanitize_replacement: null })).toThrowError(
      '`options.replacement` must be a string.',
    );
    expect(() => sanitizeSlug('test', { sanitize_replacement: 11232 })).toThrowError(
      '`options.replacement` must be a string.',
    );
    // do not test undefined for this variant since a default is set in the constructor.
    // expect(() => sanitizeSlug('test', { sanitize_replacement: undefined })).toThrowError("`options.replacement` must be a string.");
    expect(() => sanitizeSlug('test', { sanitize_replacement: () => {} })).toThrowError(
      '`options.replacement` must be a string.',
    );
  });

  it('should keep valid URI chars (letters digits _ - . ~)', () => {
    expect(sanitizeSlug('This, that-one_or.the~other 123!', slugConfig)).toEqual(
      'This-that-one_or.the~other-123',
    );
  });

  it('should remove accents with `clean_accents` set', () => {
    expect(sanitizeSlug('ěščřžý', { ...slugConfig, clean_accents: true })).toEqual('escrzy');
  });

  it('should remove non-latin chars in "ascii" mode', () => {
    expect(sanitizeSlug('ěščřžý日本語のタイトル', { ...slugConfig, encoding: 'ascii' })).toEqual(
      '',
    );
  });

  it('should clean accents and strip non-latin chars in "ascii" mode with `clean_accents` set', () => {
    expect(
      sanitizeSlug('ěščřžý日本語のタイトル', {
        ...slugConfig,
        encoding: 'ascii',
        clean_accents: true,
      }),
    ).toEqual('escrzy');
  });

  it('removes double replacements', () => {
    expect(sanitizeSlug('test--test', slugConfig)).toEqual('test-test');
    expect(sanitizeSlug('test   test', slugConfig)).toEqual('test-test');
  });

  it('removes trailing replacements', () => {
    expect(sanitizeSlug('test   test   ', slugConfig)).toEqual('test-test');
  });

  it('removes leading replacements', () => {
    expect(sanitizeSlug('"test"    test', slugConfig)).toEqual('test-test');
  });

  it('uses alternate replacements', () => {
    expect(sanitizeSlug('test   test   ', { ...slugConfig, sanitize_replacement: '_' })).toEqual(
      'test_test',
    );
  });

  it('preserves slashes when requested', () => {
    const input = '/this-is-a/nested/page';

    expect(sanitizeSlug(input, slugConfig, false)).toEqual('this-is-a-nested-page');
    expect(sanitizeSlug(input, slugConfig, true)).toEqual('this-is-a/nested/page');
  });

  // DCMS-1669 / DCMS-1939: a 3,000+ char title must not produce an equally
  // long slug (real backends reject it — GitHub 422, filesystem ENAMETOOLONG,
  // Laika backend 400 "Key or path segment too long").
  describe('max_length (DCMS-1669)', () => {
    it('applies the default 100 char cap when max_length is unset', () => {
      const longTitle = 'a'.repeat(3000);
      const result = sanitizeSlug(longTitle, slugConfig);

      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toEqual('a'.repeat(100));
    });

    it('honors a custom max_length config value', () => {
      const longTitle = 'a'.repeat(3000);
      const result = sanitizeSlug(longTitle, { ...slugConfig, max_length: 20 });

      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toEqual('a'.repeat(20));
    });

    it('does not leave a trailing replacement char after truncation', () => {
      // Cut right where a run of spaces (converted to '-') would land.
      const title = `${'a'.repeat(19)}   more text after`;
      const result = sanitizeSlug(title, { ...slugConfig, max_length: 20 });

      expect(result.endsWith('-')).toBe(false);
      expect(result).toEqual('a'.repeat(19));
    });

    it('applies the cap per segment when preserveSlashes is set', () => {
      const longSegment = 'b'.repeat(3000);
      const input = `${longSegment}/${longSegment}`;
      const result = sanitizeSlug(input, { ...slugConfig, max_length: 10 }, true);

      const segments = result.split('/');
      expect(segments).toHaveLength(2);
      segments.forEach(segment => {
        expect(segment.length).toBeLessThanOrEqual(10);
        expect(segment).toEqual('b'.repeat(10));
      });
    });

    it('applies the hard 255 ceiling even if max_length is configured higher', () => {
      const longTitle = 'c'.repeat(3000);
      const result = sanitizeSlug(longTitle, { ...slugConfig, max_length: 5000 });

      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toEqual('c'.repeat(255));
    });
  });
});

describe('sanitizeChar', () => {
  it('should sanitize whitespace with default replacement', () => {
    expect(sanitizeChar(' ', slugConfig)).toBe('-');
  });

  it('should sanitize whitespace with custom replacement', () => {
    expect(sanitizeChar(' ', { ...slugConfig, sanitize_replacement: '_' })).toBe('_');
  });
});

describe('getCollectionUrl', () => {
  it('should not prefix with /# when direct is false or undefined', () => {
    expect(getCollectionUrl('posts')).toBe('/collections/posts');
    expect(getCollectionUrl('posts', false)).toBe('/collections/posts');
  });

  it('should prefix with /# when direct is true', () => {
    expect(getCollectionUrl('posts', true)).toBe('/#/collections/posts');
  });

  it('should encode spaces, slashes, hashes and unicode in the collection name', () => {
    expect(getCollectionUrl('my posts')).toBe('/collections/my%20posts');
    expect(getCollectionUrl('a/b')).toBe('/collections/a%2Fb');
    expect(getCollectionUrl('a#b')).toBe('/collections/a%23b');
    expect(getCollectionUrl('日本語')).toBe(`/collections/${encodeURIComponent('日本語')}`);
    expect(getCollectionUrl('a b/c#d', true)).toBe('/#/collections/a%20b%2Fc%23d');
  });
});

describe('getNewEntryUrl', () => {
  it('should not prefix with /# when direct is false or undefined', () => {
    expect(getNewEntryUrl('posts')).toBe('/collections/posts/new');
    expect(getNewEntryUrl('posts', false)).toBe('/collections/posts/new');
  });

  it('should prefix with /# when direct is true', () => {
    expect(getNewEntryUrl('posts', true)).toBe('/#/collections/posts/new');
  });

  it('should encode spaces, slashes, hashes and unicode in the collection name', () => {
    expect(getNewEntryUrl('my posts')).toBe('/collections/my%20posts/new');
    expect(getNewEntryUrl('a/b')).toBe('/collections/a%2Fb/new');
    expect(getNewEntryUrl('a#b')).toBe('/collections/a%23b/new');
    expect(getNewEntryUrl('日本語')).toBe(`/collections/${encodeURIComponent('日本語')}/new`);
  });
});

describe('addParams', () => {
  it('should add new params to a url without a query string', () => {
    expect(addParams('https://example.com/path', { a: '1', b: '2' })).toBe(
      'https://example.com/path?a=1&b=2',
    );
  });

  it('should override existing params with the same name', () => {
    expect(addParams('https://example.com/path?a=old', { a: 'new' })).toBe(
      'https://example.com/path?a=new',
    );
  });

  it('should preserve existing unrelated params', () => {
    expect(addParams('https://example.com/path?keep=yes&a=old', { a: 'new', b: '2' })).toBe(
      'https://example.com/path?keep=yes&a=new&b=2',
    );
  });

  it('should encode param values', () => {
    expect(addParams('https://example.com/', { q: 'a b&c' })).toBe(
      'https://example.com/?q=a+b%26c',
    );
  });
});

describe('stripProtocol', () => {
  it('should strip https://', () => {
    expect(stripProtocol('https://example.com/path')).toBe('example.com/path');
  });

  it('should strip other protocols', () => {
    expect(stripProtocol('http://example.com')).toBe('example.com');
  });

  it('should leave protocol-less strings unchanged', () => {
    expect(stripProtocol('example.com/path')).toBe('example.com/path');
    expect(stripProtocol('/relative/path')).toBe('/relative/path');
  });

  it('should strip everything up to the first // (protocol-relative urls)', () => {
    expect(stripProtocol('//example.com/path')).toBe('example.com/path');
  });
});

describe('joinUrlPath', () => {
  it('should join base and segments with single slashes', () => {
    expect(joinUrlPath('https://example.com', 'a', 'b')).toBe('https://example.com/a/b');
  });

  it('should not duplicate slashes', () => {
    expect(joinUrlPath('https://example.com/', '/a/', '/b')).toBe('https://example.com/a/b');
  });

  it('should return the base when there are no segments', () => {
    expect(joinUrlPath('https://example.com')).toBe('https://example.com');
  });
});

describe('getCharReplacer', () => {
  it('should keep valid chars and replace invalid ones (unicode)', () => {
    const replace = getCharReplacer('unicode', { replacement: '-' });
    expect(replace('a')).toBe('a');
    expect(replace('é')).toBe('é');
    expect(replace(' ')).toBe('-');
    expect(replace('!')).toBe('-');
  });

  it('should replace non-ASCII chars in ascii mode', () => {
    const replace = getCharReplacer('ascii', { replacement: '_' });
    expect(replace('a')).toBe('a');
    expect(replace('é')).toBe('_');
    expect(replace('日')).toBe('_');
  });

  it('should replace slashes by default', () => {
    const replace = getCharReplacer('unicode', { replacement: '-' });
    expect(replace('/', 1, ['a', '/', 'b'])).toBe('-');
  });

  it('should keep inner slashes but replace leading/trailing ones when preserveSlashes is set', () => {
    const replace = getCharReplacer('unicode', { replacement: '-', preserveSlashes: true });
    const chars = ['/', 'a', '/', 'b', '/'];
    expect(chars.map(replace).join('')).toBe('-a/b-');
  });

  it('should throw on an unknown encoding', () => {
    expect(() => getCharReplacer('latin1', { replacement: '-' })).toThrow(
      '`options.encoding` must be "unicode" or "ascii".',
    );
  });

  it('should throw when the replacement is itself unsafe', () => {
    expect(() => getCharReplacer('unicode', { replacement: '!' })).toThrow(
      'The replacement character(s) (options.replacement) is itself unsafe.',
    );
  });
});
