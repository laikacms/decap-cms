import { describe, expect, it } from 'vitest';

import { sanitizeChar, sanitizeSlug, sanitizeURI } from '@/core/lib/urlHelper';

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
