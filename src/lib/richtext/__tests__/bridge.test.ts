import { describe, expect, it } from 'vitest';

import { type PortableTextDocument, stripKeys } from '@/lib/richtext/index';
import { lexicalToPortableText } from '@/lib/richtext/bridge/lexicalToPortableText';
import { portableTextToLexical } from '@/lib/richtext/bridge/portableTextToLexical';

/** PT -> Lexical -> PT, with keys stripped for comparison. */
function roundTrip(doc: PortableTextDocument): PortableTextDocument {
  return stripKeys(lexicalToPortableText(portableTextToLexical(doc)));
}

function expectStable(doc: PortableTextDocument): void {
  expect(roundTrip(doc)).toEqual(stripKeys(doc));
}

describe('PT <-> Lexical round-trip', () => {
  it('preserves headings and paragraphs', () => {
    expectStable([
      { _type: 'block', style: 'h1', markDefs: [], children: [{ _type: 'span', text: 'Title', marks: [] }] },
      { _type: 'block', style: 'h3', markDefs: [], children: [{ _type: 'span', text: 'Sub', marks: [] }] },
      { _type: 'block', style: 'normal', markDefs: [], children: [{ _type: 'span', text: 'Body', marks: [] }] },
    ]);
  });

  it('preserves blockquotes', () => {
    expectStable([
      { _type: 'block', style: 'blockquote', markDefs: [], children: [{ _type: 'span', text: 'quote', marks: [] }] },
    ]);
  });

  it('preserves decorator marks', () => {
    expectStable([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'span', text: 'plain ', marks: [] },
          { _type: 'span', text: 'bold', marks: ['strong'] },
          { _type: 'span', text: ' and ', marks: [] },
          { _type: 'span', text: 'bold-italic-code', marks: ['strong', 'em', 'code'] },
        ],
      },
    ]);
  });

  it('preserves links as mark annotations', () => {
    expectStable([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [{ _type: 'link', _key: 'm0', href: 'https://example.com' }],
        children: [
          { _type: 'span', text: 'see ', marks: [] },
          { _type: 'span', text: 'here', marks: ['m0'] },
        ],
      },
    ]);
  });

  it('preserves soft line breaks within a span', () => {
    expectStable([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: 'line one\nline two', marks: [] }],
      },
    ]);
  });

  it('preserves nested lists', () => {
    expectStable([
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [{ _type: 'span', text: 'one', marks: [] }],
      },
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 2,
        markDefs: [],
        children: [{ _type: 'span', text: 'one-a', marks: [] }],
      },
      {
        _type: 'block',
        style: 'normal',
        listItem: 'number',
        level: 1,
        markDefs: [],
        children: [{ _type: 'span', text: 'two', marks: [] }],
      },
    ]);
  });

  it('preserves code blocks', () => {
    expectStable([
      { _type: 'code', code: 'const x = 1;\nconsole.log(x);', language: 'js' },
    ]);
  });

  it('preserves custom blocks via their _type', () => {
    expectStable([
      { _type: 'image', src: '/photo.png', alt: 'A photo' },
    ]);
  });

  it('preserves inline objects among a block\'s children', () => {
    expectStable([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'span', text: 'before ', marks: [] },
          { _type: 'image', src: '/inline.png', alt: 'inline' },
          { _type: 'span', text: ' after', marks: [] },
        ],
      },
    ]);
  });

  it('preserves inline objects inside list items', () => {
    expectStable([
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [
          { _type: 'span', text: 'item ', marks: [] },
          { _type: 'image', src: '/li.png', alt: 'li' },
        ],
      },
    ]);
  });

  it('normalizes an empty document to a single empty paragraph', () => {
    expect(stripKeys(lexicalToPortableText(portableTextToLexical([])))).toEqual([
      { _type: 'block', style: 'normal', markDefs: [], children: [] },
    ]);
  });
});

describe('native editor nodes -> PT', () => {
  function state(children: Array<Record<string, unknown>>) {
    return {
      root: { type: 'root', version: 1, format: '', indent: 0, direction: null, children },
    } as unknown as Parameters<typeof lexicalToPortableText>[0];
  }

  it('exports a native horizontalrule node as a horizontal-rule block', () => {
    const doc = stripKeys(lexicalToPortableText(state([{ type: 'horizontalrule', version: 1 }])));
    expect(doc).toEqual([{ _type: 'horizontal-rule' }]);
  });

  it('exports a native inline image node as an inline image object', () => {
    const doc = stripKeys(
      lexicalToPortableText(
        state([
          {
            type: 'paragraph',
            version: 1,
            children: [
              { type: 'text', version: 1, text: 'see ', format: 0 },
              { type: 'image', version: 1, src: '/native.png', altText: 'native', maxWidth: 500 },
            ],
          },
        ]),
      ),
    );
    expect(doc).toEqual([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'span', text: 'see ', marks: [] },
          { _type: 'image', src: '/native.png', alt: 'native' },
        ],
      },
    ]);
  });

  it('exports a root-level native image node as an image block', () => {
    const doc = stripKeys(
      lexicalToPortableText(
        state([{ type: 'image', version: 1, src: '/root.png', altText: 'root' }]),
      ),
    );
    expect(doc).toEqual([{ _type: 'image', src: '/root.png', alt: 'root' }]);
  });
});
