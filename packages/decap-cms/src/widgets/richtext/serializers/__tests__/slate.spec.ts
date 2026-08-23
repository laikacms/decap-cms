import { describe, expect, it } from 'vitest';

import { markdownToSlate, slateToMarkdown } from '@/widgets/richtext/serializers/index';

import type { SlateNode } from '@/widgets/richtext/types';

/**
 * Round-trip a markdown string through the Slate AST and back. This is the
 * property the widget must not break: markdown in, equivalent markdown out.
 */
function process(markdown: string) {
  return slateToMarkdown(markdownToSlate(markdown));
}

/**
 * Upstream builds these fixtures with `slate-hyperscript` JSX. They are written
 * out as plain Slate nodes here so the suite has no JSX pragma and no extra
 * dependency; the trees are identical.
 */
function paragraph(...children: SlateNode[]): SlateNode {
  return { type: 'p', children };
}

describe('slate', () => {
  it('should not decode encoded html entities in inline code', () => {
    expect(process('<element type="code">&lt;div&gt;</element>')).toEqual(
      '<element type="code">&lt;div&gt;</element>',
    );
  });

  it('should parse non-text children of mark nodes', () => {
    expect(process('**a[b](c)d**')).toEqual('**a[b](c)d**');
    expect(process('**[a](b)**')).toEqual('**[a](b)**');
    expect(process('**![a](b)**')).toEqual('**![a](b)**');
    expect(process('_`a`_')).toEqual('*`a`*');
  });

  it('should handle unstyled code nodes adjacent to styled code nodes', () => {
    expect(process('`foo`***`bar`***')).toEqual('`foo`***`bar`***');
  });

  it('should handle styled code nodes adjacent to non-code text', () => {
    expect(process('_`a`b_')).toEqual('*`a`b*');
    expect(process('_`a`**b**_')).toEqual('*`a`**b***');
  });

  it('should condense adjacent, identically styled text and inline nodes', () => {
    expect(process('**a ~~b~~~~c~~**')).toEqual('**a ~~bc~~**');
    expect(process('**a ~~b~~~~[c](d)~~**')).toEqual('**a ~~b[c](d)~~**');
  });

  it('should handle nested markdown entities', () => {
    expect(process('**a**b**c**')).toEqual('**a**b**c**');
    expect(process('**a _b_ c**')).toEqual('**a *b* c**');
    expect(process('*`a`*')).toEqual('*`a`*');
  });

  it('should parse inline images as images', () => {
    expect(process('a ![b](c)')).toEqual('a ![b](c)');
  });

  it('should not escape markdown entities in html', () => {
    expect(process('<span>*</span>')).toEqual('<span>*</span>');
  });

  it('should wrap break tags in surrounding marks', () => {
    expect(process('*a  \nb*')).toEqual('*a\\\nb*');
  });

  it('should not output empty headers in markdown', () => {
    const slateAst: SlateNode[] = [
      { type: 'h1', children: [{ text: '' }] },
      paragraph({ text: 'foo' }),
      { type: 'h1', children: [{ text: '' }] },
    ];
    expect(slateToMarkdown(slateAst)).toEqual('foo');
  });

  it('should not output empty marks in markdown', () => {
    const slateAst: SlateNode[] = [
      paragraph(
        { text: '', bold: true },
        { text: 'foo' },
        { text: '', italic: true, bold: true },
        { text: 'bar' },
        { text: '', bold: true },
        { text: 'baz' },
        { text: '', italic: true },
      ),
    ];
    expect(slateToMarkdown(slateAst)).toEqual('foobarbaz');
  });

  it('should not produce invalid markdown when a styled block has trailing whitespace', () => {
    const slateAst: SlateNode[] = [
      paragraph(
        { text: 'foo ', bold: true },
        { text: 'bar ' },
        { text: 'bim ', bold: true },
        { text: 'bam', bold: true, italic: true },
      ),
    ];
    expect(slateToMarkdown(slateAst)).toEqual('**foo** bar **bim *bam***');
  });

  it('should not produce invalid markdown when a styled block has leading whitespace', () => {
    const slateAst: SlateNode[] = [paragraph({ text: 'foo' }, { text: ' bar', bold: true })];
    expect(slateToMarkdown(slateAst)).toEqual('foo **bar**');
  });

  it('should group adjacent marks into a single mark when possible', () => {
    const slateAst: SlateNode[] = [
      paragraph(
        { text: 'shared mark', bold: true },
        {
          type: 'a',
          url: 'link',
          children: [{ text: 'link', bold: true, italic: true }],
        },
        { text: ' ' },
        { text: 'not shared mark', bold: true },
        {
          type: 'a',
          url: 'link',
          children: [
            { text: 'another ', italic: true },
            { text: 'link', bold: true, italic: true },
          ],
        },
      ),
    ];
    expect(slateToMarkdown(slateAst)).toEqual(
      '**shared mark*[link](link)*** **not shared mark***[another **link**](link)*',
    );
  });

  describe('links', () => {
    it('should handle inline code in link content', () => {
      const slateAst: SlateNode[] = [
        paragraph({
          type: 'a',
          url: 'link',
          children: [{ text: 'foo', code: true }],
        }),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('[`foo`](link)');
    });
  });

  describe('code marks', () => {
    it('can contain other marks', () => {
      const slateAst: SlateNode[] = [
        paragraph({ text: 'foo', code: true, italic: true, bold: true }),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('***`foo`***');
    });

    it('can be condensed when no other marks are present', () => {
      const slateAst: SlateNode[] = [
        paragraph({ text: 'foo', code: true }, { text: 'bar', code: true }),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('`foo`');
    });
  });

  describe('with nested styles within a single word', () => {
    it('should not produce invalid markdown when a bold word has italics applied to a smaller part', () => {
      const slateAst: SlateNode[] = [
        paragraph(
          { text: 'h', bold: true },
          { text: 'e', bold: true, italic: true },
          { text: 'y', bold: true },
        ),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('**h*e*y**');
    });

    it('should not produce invalid markdown when an italic word has bold applied to a smaller part', () => {
      const slateAst: SlateNode[] = [
        paragraph(
          { text: 'h', italic: true },
          { text: 'e', italic: true, bold: true },
          { text: 'y', italic: true },
        ),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('*h**e**y*');
    });

    it('should handle italics inside bold inside strikethrough', () => {
      const slateAst: SlateNode[] = [
        paragraph(
          { text: 'h', strikethrough: true },
          { text: 'e', strikethrough: true, bold: true },
          { text: 'l', strikethrough: true, bold: true, italic: true },
          { text: 'l', strikethrough: true, bold: true },
          { text: 'o', strikethrough: true },
        ),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('~~h**e*l*l**o~~');
    });

    it('should handle bold inside italics inside strikethrough', () => {
      const slateAst: SlateNode[] = [
        paragraph(
          { text: 'h', strikethrough: true },
          { text: 'e', strikethrough: true, italic: true },
          { text: 'l', strikethrough: true, italic: true, bold: true },
          { text: 'l', strikethrough: true, italic: true },
          { text: 'o', strikethrough: true },
        ),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('~~h*e**l**l*o~~');
    });

    it('should handle strikethrough inside italics inside bold', () => {
      const slateAst: SlateNode[] = [
        paragraph(
          { text: 'h', bold: true },
          { text: 'e', bold: true, italic: true },
          { text: 'l', bold: true, italic: true, strikethrough: true },
          { text: 'l', bold: true, italic: true },
          { text: 'o', bold: true },
        ),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('**h*e~~l~~l*o**');
    });

    it('should handle italics inside strikethrough inside bold', () => {
      const slateAst: SlateNode[] = [
        paragraph(
          { text: 'h', bold: true },
          { text: 'e', bold: true, strikethrough: true },
          { text: 'l', bold: true, strikethrough: true, italic: true },
          { text: 'l', bold: true, strikethrough: true },
          { text: 'o', bold: true },
        ),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('**h~~e*l*l~~o**');
    });

    it('should handle strikethrough inside bold inside italics', () => {
      const slateAst: SlateNode[] = [
        paragraph(
          { text: 'h', italic: true },
          { text: 'e', italic: true, bold: true },
          { text: 'l', italic: true, bold: true, strikethrough: true },
          { text: 'l', italic: true, bold: true },
          { text: 'o', italic: true },
        ),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('*h**e~~l~~l**o*');
    });

    it('should handle bold inside strikethrough inside italics', () => {
      const slateAst: SlateNode[] = [
        paragraph(
          { text: 'h', italic: true },
          { text: 'e', italic: true, strikethrough: true },
          { text: 'l', italic: true, strikethrough: true, bold: true },
          { text: 'l', italic: true, strikethrough: true },
          { text: 'o', italic: true },
        ),
      ];
      expect(slateToMarkdown(slateAst)).toEqual('*h~~e**l**l~~o*');
    });
  });
});
