import { describe, expect, it } from 'vitest';

import { htmlMapper } from '../html-mapper';

/**
 * The HTML mapper is one of the format adapters that route through Portable
 * Text (DCMS-253): HTML never gets its own bespoke editor mapping, it only
 * ever flows HTML <-> Portable Text <-> editor.
 */
describe('htmlMapper', () => {
  it('parses headings, bold and links into Portable Text blocks', () => {
    const html = '<h1>Hello <strong>world</strong></h1><p>A <a href="https://example.com">link</a>.</p>';
    const doc = htmlMapper.toPortableText(html);

    expect(doc.length).toBe(2);
    expect(doc[0]).toMatchObject({ _type: 'block', style: 'h1' });
    expect(doc[1]).toMatchObject({ _type: 'block', style: 'normal' });
  });

  it('round-trips heading + bold + link content through PT back to HTML', () => {
    const html = '<h1>Hello <strong>world</strong></h1><p>A <a href="https://example.com">link</a>.</p>';
    const doc = htmlMapper.toPortableText(html);
    const out = htmlMapper.fromPortableText(doc);

    expect(out).toContain('Hello');
    expect(out).toContain('world');
    expect(out.toLowerCase()).toContain('<h1');
    expect(out.toLowerCase()).toContain('<strong');
    expect(out.toLowerCase()).toContain('href="https://example.com"');
  });

  it('produces stable, deterministic keys across repeated conversions', () => {
    const html = '<p>Same input</p>';
    const first = htmlMapper.toPortableText(html);
    const second = htmlMapper.toPortableText(html);
    expect(first).toEqual(second);
  });

  describe('detect', () => {
    it('scores tagged HTML above zero', () => {
      expect(htmlMapper.detect('<p>Hello <strong>world</strong></p>')).toBeGreaterThan(0);
    });

    it('scores plain prose at zero', () => {
      expect(htmlMapper.detect('Just some plain prose, no markup here.')).toBe(0);
    });

    it('scores an empty string at zero', () => {
      expect(htmlMapper.detect('')).toBe(0);
    });
  });
});
