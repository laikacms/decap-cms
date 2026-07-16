import { describe, expect, it } from 'vitest';

import { createMarkdownMapper } from '@/format-packs/markdown';
import { lexicalToPortableText } from '@/lib/richtext/bridge/lexicalToPortableText';
import { portableTextToLexical } from '@/lib/richtext/bridge/portableTextToLexical';
import { stripKeys } from '@/lib/richtext/keys';

const MARKDOWN_TABLE = '| a | b |\n| --- | --- |\n| c1 | **c2** |\n';

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
