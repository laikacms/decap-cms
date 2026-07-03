import {
  sanitizeURI,
  sanitizeSlug,
  sanitizeChar,
  addParams,
  stripProtocol,
  joinUrlPath,
} from '../urlHelper';

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
    //expect(() => sanitizeSlug('test', { sanitize_replacement: undefined })).toThrowError("`options.replacement` must be a string.");
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

  // DCMS-306: without an explicit `sanitize_replacement`, the real default must match
  // the documented default ('-'), not silently fall through to '' and smash words together.
  it('defaults to a hyphen replacement when sanitize_replacement is unset', () => {
    expect(sanitizeSlug('Hello World! Foo & Bar', {})).toEqual('Hello-World-Foo-Bar');
    expect(sanitizeSlug('Hello World! Foo & Bar')).toEqual('Hello-World-Foo-Bar');
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

describe('addParams', () => {
  it('returns the URL unchanged when given an empty params object', () => {
    expect(addParams('https://example.com/path', {})).toBe('https://example.com/path');
  });

  it('appends a single query param', () => {
    expect(addParams('https://example.com/path', { foo: 'bar' })).toBe(
      'https://example.com/path?foo=bar',
    );
  });

  it('appends multiple query params', () => {
    const result = addParams('https://example.com/', { a: '1', b: '2' });
    expect(result).toContain('a=1');
    expect(result).toContain('b=2');
  });

  it('preserves existing query params when merging', () => {
    const result = addParams('https://example.com/?existing=yes', { extra: 'value' });
    expect(result).toContain('existing=yes');
  });

  it('appends params when the URL has no existing query string', () => {
    const result = addParams('https://example.com/path', { key: 'value' });
    expect(result).toBe('https://example.com/path?key=value');
  });
});

describe('stripProtocol', () => {
  it('strips the http:// protocol prefix', () => {
    expect(stripProtocol('http://example.com/path')).toBe('example.com/path');
  });

  it('strips the https:// protocol prefix', () => {
    expect(stripProtocol('https://example.com/path')).toBe('example.com/path');
  });

  it('strips a custom scheme prefix', () => {
    expect(stripProtocol('ftp://files.example.com')).toBe('files.example.com');
  });

  it('returns the input unchanged when there is no protocol', () => {
    expect(stripProtocol('example.com/path')).toBe('example.com/path');
  });

  it('handles protocol-relative URLs (starting with //)', () => {
    expect(stripProtocol('//example.com/path')).toBe('example.com/path');
  });
});

describe('joinUrlPath', () => {
  it('returns the base when no additional segments are given', () => {
    expect(joinUrlPath('https://example.com')).toBe('https://example.com');
  });

  it('joins a base with a single path segment', () => {
    expect(joinUrlPath('https://example.com', 'foo')).toBe('https://example.com/foo');
  });

  it('joins a base with multiple path segments', () => {
    expect(joinUrlPath('https://example.com', 'foo', 'bar', 'baz')).toBe(
      'https://example.com/foo/bar/baz',
    );
  });

  it('normalizes segments that already have leading slashes', () => {
    expect(joinUrlPath('https://example.com/', '/foo/', '/bar')).toBe(
      'https://example.com/foo/bar',
    );
  });

  it('works with relative base paths', () => {
    expect(joinUrlPath('/api', 'v1', 'users')).toBe('/api/v1/users');
  });
});
