import { describe, expect, it } from 'vitest';

import { htmlMapper } from '@/format-packs/html';
import { createMarkdownMapper } from '@/format-packs/markdown';
import { lexicalToPortableText } from '@/lib/richtext/bridge/lexicalToPortableText';
import { portableTextToLexical } from '@/lib/richtext/bridge/portableTextToLexical';
import { stripKeys } from '@/lib/richtext/keys';

const MARKDOWN_TABLE = '| a | b |\n| --- | --- |\n| c1 | **c2** |\n';

const HTML_TABLE = '<table>'
  + '<thead><tr><th>a</th><th>b</th></tr></thead>'
  + '<tbody><tr><td>c1</td><td><strong>c2</strong></td></tr></tbody>'
  + '</table>';

describe('table support (markdown <-> PT <-> Lexical)', () => {
  it('parses a markdown table into a structured PT table (not flat paragraphs)', () => {
    const doc = createMarkdownMapper().toPortableText(MARKDOWN_TABLE);
    expect(doc).toHaveLength(1);
    const table = doc[0] as Record<string, any>;
    expect(table._type).toBe('table');
    expect(table.headerRows).toBe(1);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[1].cells[1].value[0].children[0].marks).toContain('strong');
  });

  it('serializes a PT table back to a markdown pipe table and round-trips', () => {
    const mapper = createMarkdownMapper();
    const doc = mapper.toPortableText(MARKDOWN_TABLE);
    const markdown = mapper.fromPortableText(doc);
    expect(markdown).toContain('|');
    expect(markdown).toContain('**c2**');
    expect(markdown).not.toContain('```json');
    expect(stripKeys(mapper.toPortableText(markdown))).toEqual(stripKeys(doc));
  });

  it('round-trips a PT table through the Lexical bridge (was dropped before)', () => {
    const mapper = createMarkdownMapper();
    const doc = mapper.toPortableText(MARKDOWN_TABLE);

    const state = portableTextToLexical(doc);
    const serialized = JSON.stringify(state);
    expect(serialized).toContain('"type":"table"');
    expect(serialized).toContain('"tablecell"');

    const back = lexicalToPortableText(state);
    expect(stripKeys(back)).toEqual(stripKeys(doc));
  });

  it('header detection survives the bridge (headerState -> headerRows)', () => {
    const doc = createMarkdownMapper().toPortableText(MARKDOWN_TABLE);
    const back = lexicalToPortableText(portableTextToLexical(doc)) as Array<Record<string, any>>;
    expect(back[0]!.headerRows).toBe(1);
  });
});

describe('table support (html <-> PT <-> Lexical)', () => {
  it('parses an html table into the same structured PT table shape', () => {
    const doc = htmlMapper.toPortableText(HTML_TABLE);
    expect(doc).toHaveLength(1);
    const table = doc[0] as Record<string, any>;
    expect(table._type).toBe('table');
    expect(table.headerRows).toBe(1);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[1].cells[1].value[0].children[0].marks).toContain('strong');
  });

  it('round-trips a PT table through the Lexical bridge and back to <table> markup', () => {
    const doc = htmlMapper.toPortableText(HTML_TABLE);

    const state = portableTextToLexical(doc);
    expect(JSON.stringify(state)).toContain('"type":"table"');

    const back = lexicalToPortableText(state);
    const html = htmlMapper.fromPortableText(back);
    expect(html).toContain('<thead><tr><th>a</th><th>b</th></tr></thead>');
    expect(html).toContain('<td>c1</td>');
    expect(html).toContain('<td><strong>c2</strong></td>');
  });

  it('html and markdown tables converge on the same keyless PT structure', () => {
    const fromHtml = stripKeys(htmlMapper.toPortableText(HTML_TABLE));
    const fromMarkdown = stripKeys(createMarkdownMapper().toPortableText(MARKDOWN_TABLE));
    expect(fromHtml).toEqual(fromMarkdown);
  });
});
