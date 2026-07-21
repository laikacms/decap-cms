import { describe, expect, it } from 'vitest';

import { sanitizeImageSrc, validateUrl } from './url';

/**
 * Regression coverage for DCMS-639 / GH #841: pasted `<img>` `src` values
 * must be validated against a safe-protocol allowlist before an ImageNode
 * (and therefore a live, fetching `<img>`) is ever created from them.
 */
describe('sanitizeImageSrc', () => {
  it('allows http(s) image URLs', () => {
    expect(sanitizeImageSrc('https://example.com/cat.png')).toBe('https://example.com/cat.png');
    expect(sanitizeImageSrc('http://example.com/cat.png')).toBe('http://example.com/cat.png');
  });

  it('allows data:image URIs', () => {
    const dataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    expect(sanitizeImageSrc(dataUri)).toBe(dataUri);
  });

  it('allows relative/same-origin references', () => {
    expect(sanitizeImageSrc('/media/cat.png', 'https://cms.example.com/')).toBe('/media/cat.png');
    expect(sanitizeImageSrc('x', 'https://cms.example.com/')).toBe('x');
  });

  it('rejects javascript: URLs', () => {
    expect(sanitizeImageSrc('javascript:alert(1)', 'https://cms.example.com/')).toBeNull();
  });

  it('rejects vbscript: URLs', () => {
    expect(sanitizeImageSrc('vbscript:msgbox("x")', 'https://cms.example.com/')).toBeNull();
  });

  it('rejects file: URLs', () => {
    expect(sanitizeImageSrc('file:///etc/passwd', 'https://cms.example.com/')).toBeNull();
  });

  it('rejects non-image data URIs', () => {
    expect(sanitizeImageSrc('data:text/html,<script>alert(1)</script>', 'https://cms.example.com/')).toBeNull();
  });

  it('rejects empty and unparseable values', () => {
    expect(sanitizeImageSrc('', 'https://cms.example.com/')).toBeNull();
    expect(sanitizeImageSrc('   ', 'https://cms.example.com/')).toBeNull();
  });
});

/**
 * Regression coverage for GH #1257: a bare `https://` must never validate
 * as a linkable URL. Previously `validateUrl` hard-coded `url === 'https://'`
 * as always valid, which let the Lexical link plugin auto-linkify a bare
 * `https://` into an unusable link.
 */
describe('validateUrl', () => {
  it('rejects a bare https:// with no host', () => {
    expect(validateUrl('https://')).toBe(false);
  });

  it('allows well-formed http(s) URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://example.com/path?query=1#hash')).toBe(true);
  });

  it('allows www-prefixed and mailto URLs', () => {
    expect(validateUrl('www.example.com')).toBe(true);
    expect(validateUrl('mailto:foo@example.com')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(validateUrl('')).toBe(false);
  });
});
