import { describe, expect, it } from 'vitest';

import { lexicalToPortableText } from '@/lib/richtext/bridge/lexicalToPortableText';
import { portableTextToLexical } from '@/lib/richtext/bridge/portableTextToLexical';
import { stripKeys } from '@/lib/richtext/keys';
import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { $createImageNode, ImageNode } from '@/ui/editor/nodes/ImageNode';

import type { PortableTextDocument } from '@/lib/richtext/portable-text';

/** Run `fn` (which may call `$`-prefixed Lexical functions) inside an editor update. */
function withHeadlessEditor<T>(fn: () => T): T {
  const editor = createHeadlessEditor([ImageNode]);
  let result!: T;
  editor.update(() => {
    result = fn();
  }, { discrete: true });
  return result;
}

/**
 * Regression coverage for DCMS-1183 / GH #1183: `portableTextToLexical` had
 * no branch for the reserved `image`/`horizontal-rule` block types, so
 * persisted blocks of those types fell through to `customBlockNode(...)`
 * and rendered "Unknown block" after a backup restore (or any other load
 * path through the bridge). Mirrors the shape of `table-roundtrip.spec.ts`.
 */
describe('reserved image/horizontal-rule blocks (PT <-> Lexical bridge)', () => {
  it('round-trips a PT image block through the Lexical bridge (was dropped to a custom block before)', () => {
    const doc: PortableTextDocument = [
      { _type: 'image', src: 'https://example.com/foo.png', alt: 'h' },
    ];

    const state = portableTextToLexical(doc);
    const serialized = JSON.stringify(state);
    expect(serialized).toContain('"type":"image"');
    expect(serialized).not.toContain('"type":"decap-block"');

    const back = lexicalToPortableText(state);
    expect(stripKeys(back)).toEqual(stripKeys(doc));
  });

  it('gates a non-data image src behind consent on rehydrate (DCMS-640 / DCMS-1166)', () => {
    const doc: PortableTextDocument = [
      { _type: 'image', src: 'https://example.com/foo.png', alt: 'h' },
    ];

    const state = portableTextToLexical(doc);
    const imageJson = (state as unknown as { root: { children: Array<Record<string, unknown>> } })
      .root.children[0]!;
    expect(imageJson.requiresConsent).toBe(true);

    const requiresConsent = withHeadlessEditor(() => ImageNode.importJSON(imageJson as never).getRequiresConsent());
    expect(requiresConsent).toBe(true);
  });

  it('does not gate a data: image src on rehydrate', () => {
    const doc: PortableTextDocument = [
      { _type: 'image', src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'h' },
    ];

    const state = portableTextToLexical(doc);
    const imageJson = (state as unknown as { root: { children: Array<Record<string, unknown>> } })
      .root.children[0]!;
    expect(imageJson.requiresConsent).toBe(false);

    const requiresConsent = withHeadlessEditor(() => ImageNode.importJSON(imageJson as never).getRequiresConsent());
    expect(requiresConsent).toBe(false);
  });

  it("importJSON ignores requiresConsent when the editor's own exportJSON is round-tripped (no re-gate regression)", () => {
    const requiresConsentAfterReimport = withHeadlessEditor(() => {
      const node = $createImageNode({ altText: '', requiresConsent: true, src: 'https://example.com/x.png' });
      const exported = node.exportJSON();
      expect('requiresConsent' in exported).toBe(false);
      return ImageNode.importJSON(exported).getRequiresConsent();
    });
    expect(requiresConsentAfterReimport).toBe(false);
  });

  it('round-trips a PT horizontal-rule block through the Lexical bridge (was dropped to a custom block before)', () => {
    const doc: PortableTextDocument = [{ _type: 'horizontal-rule' }];

    const state = portableTextToLexical(doc);
    const serialized = JSON.stringify(state);
    expect(serialized).toContain('"type":"horizontalrule"');
    expect(serialized).not.toContain('"type":"decap-block"');

    const back = lexicalToPortableText(state);
    expect(stripKeys(back)).toEqual(stripKeys(doc));
  });

  it('maps a reserved inline image PT object to ImageNode, not decap-inline-block (DCMS-1198)', () => {
    const doc: PortableTextDocument = [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'image', src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'data-uri' },
          { _type: 'image', src: 'https://example.com/b.png', alt: 'B' },
        ],
      },
    ];

    const state = portableTextToLexical(doc);
    const paragraph = (state as unknown as { root: { children: Array<Record<string, unknown>> } })
      .root.children[0]!;
    const inlineNodes = paragraph.children as Array<Record<string, unknown>>;

    expect(inlineNodes).toHaveLength(2);
    expect(inlineNodes.map(node => node.type)).toEqual(['image', 'image']);
    expect(inlineNodes.some(node => node.type === 'decap-inline-block')).toBe(false);
    expect(inlineNodes[0]!.requiresConsent).toBe(false);
    expect(inlineNodes[1]!.requiresConsent).toBe(true);

    const back = lexicalToPortableText(state);
    expect(stripKeys(back)).toEqual(stripKeys(doc));
  });

  it('round-trips a document mixing text, an image, and a horizontal rule', () => {
    const doc: PortableTextDocument = [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: 'before', marks: [] }],
      },
      { _type: 'image', src: '/photo.png', alt: 'A photo' },
      { _type: 'horizontal-rule' },
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: 'after', marks: [] }],
      },
    ];

    const back = lexicalToPortableText(portableTextToLexical(doc));
    expect(stripKeys(back)).toEqual(stripKeys(doc));
  });
});
