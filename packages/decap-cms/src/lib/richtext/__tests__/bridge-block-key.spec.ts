import { describe, expect, it } from 'vitest';

import { lexicalToPortableText } from '@/lib/richtext/bridge/lexicalToPortableText';
import { portableTextToLexical } from '@/lib/richtext/bridge/portableTextToLexical';

import type { PortableTextDocument } from '@/lib/richtext/portable-text';

describe('bridge _key preservation for custom blocks', () => {
  it('round-trips the _key of a custom block', () => {
    const doc: PortableTextDocument = [
      { _type: 'youtube', _key: 'stable-key-1', id: 'abc' },
    ];
    const state = portableTextToLexical(doc);
    const back = lexicalToPortableText(state);
    expect(back).toEqual(doc);
  });

  it('round-trips the _key of an inline custom object', () => {
    const doc: PortableTextDocument = [
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'span', _key: 's0', text: 'Hi ', marks: [] },
          { _type: 'badge', _key: 'stable-key-2', label: 'new' },
        ],
      },
    ];
    const state = portableTextToLexical(doc);
    const back = lexicalToPortableText(state) as Array<Record<string, any>>;
    const inline = back[0]!.children.find((c: any) => c._type === 'badge');
    expect(inline._key).toBe('stable-key-2');
    expect(inline.label).toBe('new');
  });

  it('generates a key for editor-created blocks without one', () => {
    const state = {
      root: {
        type: 'root',
        version: 1,
        children: [
          { type: 'decap-block', version: 1, componentId: 'youtube', data: { id: 'x' } },
        ],
      },
    };
    const back = lexicalToPortableText(state as any);
    expect(typeof (back[0] as Record<string, unknown>)._key).toBe('string');
  });
});
