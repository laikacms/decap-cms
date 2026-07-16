import { $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';

import { $insertBlock, resolveDefaultData } from '@/lib/richtext/blocks/insert';
import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';

import type { BlockDefinition } from '@/lib/richtext/blocks/types';

describe('resolveDefaultData', () => {
  it('returns an empty object without defaultData', () => {
    expect(resolveDefaultData({ id: 'x', fields: [] })).toEqual({});
  });

  it('copies a defaultData object (no shared reference)', () => {
    const defaultData = { id: 'a' };
    const definition: BlockDefinition = { id: 'x', fields: [], defaultData };
    const resolved = resolveDefaultData(definition);
    expect(resolved).toEqual(defaultData);
    expect(resolved).not.toBe(defaultData);
  });

  it('invokes a defaultData factory', () => {
    const definition: BlockDefinition = { id: 'x', fields: [], defaultData: () => ({ n: 1 }) };
    expect(resolveDefaultData(definition)).toEqual({ n: 1 });
  });
});

describe('$insertBlock', () => {
  it('inserts a decap-block with the resolved default data', () => {
    const definition: BlockDefinition = {
      id: 'youtube',
      fields: [{ name: 'id' }],
      defaultData: { id: '' },
    };
    const editor = createHeadlessEditor();
    editor.update(
      () => {
        $getRoot().selectEnd();
        $insertBlock(definition);
      },
      { discrete: true },
    );

    const serialized = JSON.stringify(editor.getEditorState().toJSON());
    expect(serialized).toContain('"type":"decap-block"');
    expect(serialized).toContain('"componentId":"youtube"');
  });

  it('inserts a decap-inline-block for inline definitions', () => {
    const definition: BlockDefinition = { id: 'badge', fields: [], inline: true };
    const editor = createHeadlessEditor();
    editor.update(
      () => {
        $getRoot().selectEnd();
        $insertBlock(definition);
      },
      { discrete: true },
    );

    const serialized = JSON.stringify(editor.getEditorState().toJSON());
    expect(serialized).toContain('"type":"decap-inline-block"');
    expect(serialized).toContain('"componentId":"badge"');
  });
});
