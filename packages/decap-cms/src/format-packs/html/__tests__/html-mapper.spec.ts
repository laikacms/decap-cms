import { describe, expect, it } from 'vitest';

import { htmlMapper } from '@/format-packs/html';

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

  describe('tables', () => {
    const tableHtml = '<table>'
      + '<thead><tr><th>Name</th><th>Price</th></tr></thead>'
      + '<tbody><tr><td>Widget</td><td><strong>10</strong></td></tr>'
      + '<tr><td>Gadget</td><td>20</td></tr></tbody>'
      + '</table>';

    it('parses a table into the structured PT table shape the bridge round-trips', () => {
      const doc = htmlMapper.toPortableText(tableHtml);

      expect(doc.length).toBe(1);
      const table = doc[0] as Record<string, any>;
      expect(table).toMatchObject({ _type: 'table', headerRows: 1 });
      expect(table.rows.length).toBe(3);
      expect(table.rows[0]).toMatchObject({ _type: 'row' });
      expect(table.rows[0].cells[0]).toMatchObject({ _type: 'cell' });
      // Cell values are their own PT documents.
      expect(table.rows[0].cells[0].value[0]).toMatchObject({ _type: 'block' });
      expect(table.rows[0].cells[0].value[0].children[0].text).toBe('Name');
      // Marks inside cells survive.
      expect(table.rows[1].cells[1].value[0].children[0]).toMatchObject({
        text: '10',
        marks: ['strong'],
      });
      // Every row/cell carries a `_key` (the diff/identity primitive).
      expect(typeof table.rows[0]._key).toBe('string');
      expect(typeof table.rows[0].cells[0]._key).toBe('string');
    });

    it('round-trips table content through PT back to <table> markup', () => {
      const doc = htmlMapper.toPortableText(tableHtml);
      const out = htmlMapper.fromPortableText(doc);

      expect(out).toContain('<table>');
      expect(out).toContain('<thead><tr><th>Name</th><th>Price</th></tr></thead>');
      expect(out).toContain('<tbody>');
      expect(out).toContain('<td>Widget</td>');
      expect(out).toContain('<td><strong>10</strong></td>');
      expect(out).toContain('<td>Gadget</td>');
    });

    it('parses a headerless table without a headerRows field', () => {
      const doc = htmlMapper.toPortableText('<table><tr><td>a</td><td>b</td></tr></table>');
      const table = doc[0] as Record<string, any>;
      expect(table._type).toBe('table');
      expect(table.headerRows).toBeUndefined();
      expect(table.rows.length).toBe(1);

      const out = htmlMapper.fromPortableText(doc);
      expect(out).toBe('<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>');
    });

    it('keeps multi-block cell content as block markup', () => {
      const doc = htmlMapper.toPortableText(
        '<table><tr><td><p>one</p><p>two</p></td></tr></table>',
      );
      const out = htmlMapper.fromPortableText(doc);
      expect(out).toContain('<td><p>one</p><p>two</p></td>');
    });

    it('produces stable, deterministic keys across repeated table conversions', () => {
      const first = htmlMapper.toPortableText(tableHtml);
      const second = htmlMapper.toPortableText(tableHtml);
      expect(first).toEqual(second);
    });

    it('scores table markup above zero', () => {
      expect(htmlMapper.detect('<table><tr><td>x</td></tr></table>')).toBeGreaterThan(0);
    });
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
