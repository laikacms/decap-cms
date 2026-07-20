import { describe, expect, it } from 'vitest';

import { parseMdx } from '@/format-packs/mdx/parse/fromMdx';
import { mdastToPortableText } from '@/format-packs/mdx/parse/mdastToPortableText';
import { createKeyGenerator } from '@/lib/richtext/keys';

import type { PortableTextDocument } from '@/lib/richtext';
import type { Root } from 'mdast';

/**
 * `mdastToPortableText` is the core mdast -> Portable Text conversion for the
 * MDX format pack (fromMdx.ts is a 29-line thin wrapper around
 * `mdast-util-from-markdown`). Neither had any test coverage, unlike every
 * other format pack. These tests exercise the node-type branches directly
 * (paragraphs, headings, lists, emphasis/strong, links, code blocks, tables,
 * images, JSX, expressions) plus the "opaque paragraph" ESM post-pass
 * documented on `parseMdx` and implemented in `convertParagraph`.
 */

function convert(source: string): PortableTextDocument {
  return mdastToPortableText(parseMdx(source), {
    keyGenerator: createKeyGenerator('k'),
    source,
  });
}

describe('mdastToPortableText: paragraphs', () => {
  it('converts a simple paragraph into a normal-style block with one span', () => {
    const doc = convert('Hello world.\n');
    expect(doc).toHaveLength(1);
    const block = doc[0] as Record<string, unknown>;
    expect(block._type).toBe('block');
    expect(block.style).toBe('normal');
    expect(block.markDefs).toEqual([]);
    expect(block.children).toEqual([
      { _type: 'span', _key: 'k1', text: 'Hello world.', marks: [] },
    ]);
    expect(typeof block._key).toBe('string');
  });

  it('keeps two paragraphs as two separate blocks', () => {
    const doc = convert('First.\n\nSecond.\n');
    expect(doc.map(node => node._type)).toEqual(['block', 'block']);
    expect((doc[0] as Record<string, unknown>).style).toBe('normal');
    expect((doc[1] as Record<string, unknown>).style).toBe('normal');
  });

  it('collapses a paragraph whose sole child is an image into a standalone image object', () => {
    const doc = convert('![alt text](https://example.com/pic.png "a title")\n');
    expect(doc).toHaveLength(1);
    expect(doc[0]).toMatchObject({
      _type: 'image',
      src: 'https://example.com/pic.png',
      alt: 'alt text',
      title: 'a title',
    });
  });

  it('burns a block key for the collapsed image paragraph (key-order dialect quirk)', () => {
    const doc = convert('![alt](https://example.com/pic.png)\n\nAfter.\n');
    // k0 is burned as the paragraph's block key, k1 is the image's key,
    // k2/k3 are the following paragraph's block/span keys.
    expect((doc[0] as Record<string, unknown>)._key).toBe('k1');
    const after = doc[1] as Record<string, unknown>;
    expect(after._key).toBe('k2');
    expect((after.children as Array<Record<string, unknown>>)[0]._key).toBe('k3');
  });
});

describe('mdastToPortableText: headings', () => {
  it.each([1, 2, 3, 4, 5, 6] as const)('converts a level-%i heading to style h%i', level => {
    const doc = convert(`${'#'.repeat(level)} Heading text\n`);
    const block = doc[0] as Record<string, unknown>;
    expect(block._type).toBe('block');
    expect(block.style).toBe(`h${level}`);
    expect(block.children).toEqual([
      { _type: 'span', _key: 'k1', text: 'Heading text', marks: [] },
    ]);
  });
});

describe('mdastToPortableText: emphasis, strong, and nested marks', () => {
  it('marks an emphasis span with "em"', () => {
    const doc = convert('*italic*\n');
    const block = doc[0] as Record<string, unknown>;
    expect(block.children).toEqual([
      { _type: 'span', _key: 'k1', text: 'italic', marks: ['em'] },
    ]);
  });

  it('marks a strong span with "strong"', () => {
    const doc = convert('**bold**\n');
    const block = doc[0] as Record<string, unknown>;
    expect(block.children).toEqual([
      { _type: 'span', _key: 'k1', text: 'bold', marks: ['strong'] },
    ]);
  });

  it('marks a strikethrough span with "strike-through"', () => {
    const doc = convert('~~gone~~\n');
    const block = doc[0] as Record<string, unknown>;
    expect(block.children).toEqual([
      { _type: 'span', _key: 'k1', text: 'gone', marks: ['strike-through'] },
    ]);
  });

  it('marks inline code with "code"', () => {
    const doc = convert('`code span`\n');
    const block = doc[0] as Record<string, unknown>;
    expect(block.children).toEqual([
      { _type: 'span', _key: 'k1', text: 'code span', marks: ['code'] },
    ]);
  });

  it('stacks nested marks (strong inside emphasis) on the innermost span', () => {
    const doc = convert('*italic **and bold***\n');
    const block = doc[0] as Record<string, unknown>;
    const spans = block.children as Array<Record<string, unknown>>;
    expect(spans[0]).toEqual({ _type: 'span', _key: 'k1', text: 'italic ', marks: ['em'] });
    expect(spans[1]).toMatchObject({ text: 'and bold' });
    expect((spans[1].marks as string[]).sort()).toEqual(['em', 'strong']);
  });

  it('merges adjacent text runs with the same mark set into one span', () => {
    const doc = convert('**bold text**\n');
    const block = doc[0] as Record<string, unknown>;
    expect(block.children).toEqual([
      { _type: 'span', _key: 'k1', text: 'bold text', marks: ['strong'] },
    ]);
  });

  it('converts a hard line break to a literal newline in the span text', () => {
    const doc = convert('line one  \nline two\n');
    const block = doc[0] as Record<string, unknown>;
    const spans = block.children as Array<Record<string, unknown>>;
    const text = spans.map(s => s.text).join('');
    expect(text).toBe('line one\nline two');
  });
});

describe('mdastToPortableText: links', () => {
  it('creates a link markDef and applies its key as a mark on the span', () => {
    const doc = convert('[click here](https://example.com "a title")\n');
    const block = doc[0] as Record<string, unknown>;
    const markDefs = block.markDefs as Array<Record<string, unknown>>;
    expect(markDefs).toHaveLength(1);
    expect(markDefs[0]).toMatchObject({ _type: 'link', href: 'https://example.com', title: 'a title' });
    const span = (block.children as Array<Record<string, unknown>>)[0];
    expect(span.marks).toEqual([markDefs[0]._key]);
    expect(span.text).toBe('click here');
  });

  it('resolves a reference-style link against its definition', () => {
    const doc = convert('[click here][ref]\n\n[ref]: https://example.com "title"\n');
    const block = doc[0] as Record<string, unknown>;
    const markDefs = block.markDefs as Array<Record<string, unknown>>;
    expect(markDefs).toHaveLength(1);
    expect(markDefs[0]).toMatchObject({ _type: 'link', href: 'https://example.com', title: 'title' });
  });

  it('parseMdx never emits a linkReference node when no definition resolves it (falls back to literal text)', () => {
    const doc = convert('[click here][missing]\n');
    const block = doc[0] as Record<string, unknown>;
    expect(block.markDefs).toEqual([]);
    expect((block.children as Array<Record<string, unknown>>)[0]).toMatchObject({
      text: '[click here][missing]',
      marks: [],
    });
  });

  it('falls back to plain inline content for a hand-built linkReference node with no matching definition', () => {
    // Defensive branch: `mdast-util-from-markdown` never produces a
    // `linkReference` node without a resolvable definition (CommonMark
    // treats it as literal text instead), so exercise the converter's
    // `else` branch directly against a hand-built mdast tree.
    const root: Root = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'linkReference',
              identifier: 'missing',
              referenceType: 'full',
              children: [{ type: 'text', value: 'click here' }],
            },
          ],
        },
      ],
    };
    const doc = mdastToPortableText(root, { keyGenerator: createKeyGenerator('k'), source: '' });
    const block = doc[0] as Record<string, unknown>;
    expect(block.markDefs).toEqual([]);
    expect((block.children as Array<Record<string, unknown>>)[0]).toMatchObject({
      text: 'click here',
      marks: [],
    });
  });
});

describe('mdastToPortableText: inline images', () => {
  it('pushes an inline image object into the surrounding block children', () => {
    const doc = convert('Look: ![alt](https://example.com/x.png) done.\n');
    const block = doc[0] as Record<string, unknown>;
    const children = block.children as Array<Record<string, unknown>>;
    const image = children.find(c => c._type === 'image');
    expect(image).toMatchObject({ src: 'https://example.com/x.png', alt: 'alt' });
    expect(image).not.toHaveProperty('title');
  });
});

describe('mdastToPortableText: lists', () => {
  it('converts an unordered list into bullet list-item blocks', () => {
    const doc = convert('- one\n- two\n');
    expect(doc).toHaveLength(2);
    for (const node of doc) {
      const block = node as Record<string, unknown>;
      expect(block.listItem).toBe('bullet');
      expect(block.level).toBe(1);
    }
    expect((doc[0] as Record<string, unknown>).children).toMatchObject([{ text: 'one' }]);
    expect((doc[1] as Record<string, unknown>).children).toMatchObject([{ text: 'two' }]);
  });

  it('converts an ordered list into number list-item blocks', () => {
    const doc = convert('1. one\n2. two\n');
    for (const node of doc) {
      expect((node as Record<string, unknown>).listItem).toBe('number');
    }
  });

  it('converts a GFM task list item into a checked task block', () => {
    const doc = convert('- [x] done\n- [ ] not done\n');
    expect(doc[0]).toMatchObject({ listItem: 'task', checked: true });
    expect(doc[1]).toMatchObject({ listItem: 'task', checked: false });
  });

  it('increments level for a nested list and emits it after the parent item block', () => {
    const doc = convert('- parent\n  - child\n');
    expect(doc).toHaveLength(2);
    expect(doc[0]).toMatchObject({ listItem: 'bullet', level: 1 });
    expect(doc[1]).toMatchObject({ listItem: 'bullet', level: 2 });
  });
});

describe('mdastToPortableText: blockquotes', () => {
  it('converts blockquote paragraphs into blockquote-style blocks', () => {
    const doc = convert('> quoted text\n');
    expect(doc).toHaveLength(1);
    expect(doc[0]).toMatchObject({ style: 'blockquote' });
  });
});

describe('mdastToPortableText: code blocks', () => {
  it('converts a fenced code block with a language into a code block', () => {
    const doc = convert('```js\nconst x = 1;\n```\n');
    expect(doc[0]).toMatchObject({ _type: 'code', language: 'js', code: 'const x = 1;' });
  });

  it('joins language and meta with a space', () => {
    const doc = convert('```js title="example.js"\nconst x = 1;\n```\n');
    expect(doc[0]).toMatchObject({ _type: 'code', language: 'js title="example.js"' });
  });

  it('omits the language field for an unlabeled fenced code block', () => {
    const doc = convert('```\nplain\n```\n');
    const block = doc[0] as Record<string, unknown>;
    expect(block._type).toBe('code');
    expect(block).not.toHaveProperty('language');
    expect(block.code).toBe('plain');
  });
});

describe('mdastToPortableText: thematic break', () => {
  it('converts a thematic break into a horizontal-rule block', () => {
    const doc = convert('---\n');
    expect(doc).toEqual([{ _key: 'k0', _type: 'horizontal-rule' }]);
  });
});

describe('mdastToPortableText: tables', () => {
  it('converts a GFM table into a table object with header/data rows', () => {
    const doc = convert('| A | B |\n| - | - |\n| 1 | 2 |\n');
    expect(doc).toHaveLength(1);
    const table = doc[0] as Record<string, unknown>;
    expect(table._type).toBe('table');
    expect(table.headerRows).toBe(1);
    const rows = table.rows as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].cells as unknown[]).toHaveLength(2);
  });

  it('unwraps a single-image table cell into the bare image object', () => {
    const doc = convert(
      '| A |\n| - |\n| ![alt](https://example.com/x.png) |\n',
    );
    const table = doc[0] as Record<string, unknown>;
    const rows = table.rows as Array<Record<string, unknown>>;
    const cell = (rows[1].cells as Array<Record<string, unknown>>)[0];
    expect((cell.value as Array<Record<string, unknown>>)[0]).toMatchObject({
      _type: 'image',
      src: 'https://example.com/x.png',
    });
  });

  it('includes an alignment array only when at least one column is aligned', () => {
    const unaligned = convert('| A | B |\n| - | - |\n| 1 | 2 |\n');
    expect(unaligned[0]).not.toHaveProperty('alignment');

    const aligned = convert('| A | B |\n| :- | -: |\n| 1 | 2 |\n');
    expect(aligned[0]).toMatchObject({ alignment: ['left', 'right'] });
  });
});

describe('mdastToPortableText: JSX elements', () => {
  it('converts a capitalized flow JSX element with attributes to a typed PT block', () => {
    const doc = convert('<YouTube id="abc123" />\n');
    expect(doc).toHaveLength(1);
    expect(doc[0]).toMatchObject({ _type: 'YouTube', id: 'abc123' });
    expect(doc[0]).not.toHaveProperty('children');
  });

  it('resolves the JSX type name through resolveTypeForJsxName', () => {
    const source = '<YouTube id="abc123" />\n';
    const doc = mdastToPortableText(parseMdx(source), {
      keyGenerator: createKeyGenerator('k'),
      source,
      resolveTypeForJsxName: name => `custom-${name}`,
    });
    expect(doc[0]).toMatchObject({ _type: 'custom-YouTube' });
  });

  it('nests flow JSX children as a PT array under `children`', () => {
    const doc = convert('<Card>\n\nInner paragraph.\n\n</Card>\n');
    const card = doc[0] as Record<string, unknown>;
    expect(card._type).toBe('Card');
    const children = card.children as PortableTextDocument;
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({ _type: 'block', style: 'normal' });
  });

  it('wraps inline JSX children as phrasing content in one nested block', () => {
    const doc = convert('<Highlight>inner text</Highlight>\n');
    const block = doc[0] as Record<string, unknown>;
    const highlight = (block.children as Array<Record<string, unknown>>).find(
      c => c._type === 'Highlight',
    );
    expect(highlight).toBeDefined();
    const nested = highlight!.children as PortableTextDocument;
    expect(nested).toHaveLength(1);
    expect(nested[0]).toMatchObject({ _type: 'block', style: 'normal' });
  });

  it('falls back to opaque mdx-jsx for a lowercase element name', () => {
    const source = '<div className="x">hi</div>\n';
    const doc = convert(source);
    const block = doc[0] as Record<string, unknown>;
    const opaque = block.children as Array<Record<string, unknown>>;
    expect(opaque[0]).toMatchObject({ _type: 'mdx-jsx', value: '<div className="x">hi</div>' });
  });

  it('falls back to opaque mdx-jsx for a capitalized element with a spread attribute', () => {
    const source = '<Foo {...props} />\n';
    const doc = convert(source);
    expect(doc[0]).toMatchObject({ _type: 'mdx-jsx', value: '<Foo {...props} />' });
  });

  it('falls back to opaque mdx-jsx for a capitalized element using a reserved prop name', () => {
    const source = '<Foo _key="stolen" />\n';
    const doc = convert(source);
    expect(doc[0]).toMatchObject({ _type: 'mdx-jsx' });
    expect((doc[0] as Record<string, unknown>).value).toContain('_key="stolen"');
  });
});

describe('mdastToPortableText: expressions', () => {
  it('converts a flow expression to an opaque mdx-expression block', () => {
    const doc = convert('{1 + 1}\n');
    expect(doc[0]).toMatchObject({ _type: 'mdx-expression', value: '1 + 1' });
  });

  it('converts a text expression inline within a paragraph', () => {
    const doc = convert('Value: {x} end.\n');
    const block = doc[0] as Record<string, unknown>;
    const expr = (block.children as Array<Record<string, unknown>>).find(
      c => c._type === 'mdx-expression',
    );
    expect(expr).toMatchObject({ value: 'x' });
  });
});

describe('mdastToPortableText: definitions', () => {
  it('emits nothing for a standalone link-reference definition', () => {
    const doc = convert('[ref]: https://example.com\n');
    expect(doc).toEqual([]);
  });
});

describe('mdastToPortableText: deterministic key generation', () => {
  it('produces identical output (including keys) across repeated conversions of the same source', () => {
    const source = '# Title\n\nSome **bold** text with a [link](https://example.com).\n\n- one\n- two\n';
    expect(convert(source)).toEqual(convert(source));
  });

  it('never leaves an empty block without a placeholder empty span', () => {
    // An mdx-jsx flow element with no phrasing content pushed into an
    // otherwise-empty nested block would surface this if closeBlock's
    // empty-children guard regressed; assert directly on the guarded case
    // via a list item whose paragraph has no text (edge: heading with only
    // a JSX child collapsing to nothing is out of scope, so use a blank
    // emphasis run instead to sanity check closeBlock never emits 0 children).
    const doc = convert('*  \n');
    // Guard: whatever the doc is, no block-type node has empty children.
    for (const node of doc) {
      if ((node as Record<string, unknown>)._type === 'block') {
        expect((node as Record<string, unknown>).children).not.toHaveLength(0);
      }
    }
  });
});

describe('fromMdx (parseMdx): opaque paragraph / ESM post-pass', () => {
  it('parses a top-level import line as a plain paragraph (no ESM mdast node)', () => {
    const root = parseMdx("import Foo from './foo';\n\nHello.\n");
    expect(root.children.map(node => node.type)).toEqual(['paragraph', 'paragraph']);
  });

  it('post-passes a top-level import paragraph into an opaque mdx-esm block', () => {
    const source = "import Foo from './foo';\n\nHello.\n";
    const doc = convert(source);
    expect(doc[0]).toMatchObject({
      _type: 'mdx-esm',
      value: "import Foo from './foo';",
    });
    expect(doc[1]).toMatchObject({ _type: 'block', style: 'normal' });
  });

  it('post-passes a top-level export paragraph into an opaque mdx-esm block', () => {
    const source = 'export const meta = 1;\n\nHello.\n';
    const doc = convert(source);
    expect(doc[0]).toMatchObject({ _type: 'mdx-esm', value: 'export const meta = 1;' });
  });

  it('does NOT treat an import/export line nested inside a blockquote as ESM (atRoot guard)', () => {
    const source = "> import Foo from './foo';\n";
    const doc = convert(source);
    expect(doc[0]).toMatchObject({ _type: 'block', style: 'blockquote' });
    expect((doc[0] as Record<string, unknown>).children).toMatchObject([
      { text: "import Foo from './foo';" },
    ]);
  });

  it('does not treat a paragraph merely containing the words "import"/"export" mid-sentence as ESM', () => {
    const doc = convert('We import goods and export them.\n');
    expect(doc[0]).toMatchObject({ _type: 'block', style: 'normal' });
  });

  it('round-trips the verbatim ESM source slice, including surrounding punctuation', () => {
    const source = "import { a, b } from 'mod';\n";
    const doc = convert(source);
    expect(doc[0]).toMatchObject({
      _type: 'mdx-esm',
      value: "import { a, b } from 'mod';",
    });
  });

  it('parseMdx enables GFM syntax (tables, strikethrough, task lists, autolinks)', () => {
    const root = parseMdx('~~strike~~ https://example.com\n');
    // Sanity: strikethrough via GFM `delete` node reaches the mdast tree.
    const paragraph = root.children[0] as { children: Array<{ type: string }> };
    expect(paragraph.children.some(child => child.type === 'delete')).toBe(true);
  });
});
