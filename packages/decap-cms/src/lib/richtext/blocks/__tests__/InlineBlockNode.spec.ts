import { $getNodeByKey, $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';

import {
  $createInlineBlockNode,
  $isInlineBlockNode,
  INLINE_BLOCK_NODE_TYPE,
  InlineBlockNode,
} from '@/lib/richtext/blocks/InlineBlockNode';
import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';

import type { LexicalEditor, NodeKey } from 'lexical';

/**
 * DCMS-1854: `InlineBlockNode` is the inline counterpart of `BlockNode` — a
 * Lexical `DecoratorNode` carrying a Portable Text inline object
 * (`componentId`, `data`, `blockKey`) through the PT <-> Lexical round-trip.
 * Mirrors the pure-function serialization coverage style used for `BlockNode`
 * in `historyCoalesceIntegration.spec.ts`. Node construction/clone must run
 * inside `editor.update()`/`editor.getEditorState().read()` — Lexical's
 * `LexicalNode` constructor calls `$setNodeKey`, which requires an active
 * editor context.
 */

function insertInlineBlock(
  editor: LexicalEditor,
  componentId = 'icon',
  data: Record<string, unknown> = { label: 'star' },
  blockKey?: string,
): NodeKey {
  let key = '';
  editor.update(
    () => {
      const node = $createInlineBlockNode(componentId, data, blockKey);
      $getRoot().append(node);
      key = node.getKey();
    },
    { discrete: true },
  );
  return key;
}

describe('InlineBlockNode', () => {
  it('getType() returns INLINE_BLOCK_NODE_TYPE', () => {
    expect(InlineBlockNode.getType()).toBe(INLINE_BLOCK_NODE_TYPE);
    expect(INLINE_BLOCK_NODE_TYPE).toBe('decap-inline-block');
  });

  it('exportJSON/importJSON round-trip preserves componentId, data, and blockKey', () => {
    const editor = createHeadlessEditor([InlineBlockNode]);
    const nodeKey = insertInlineBlock(editor, 'icon', { label: 'star', size: 24 }, 'pt-key-1');

    let exported!: ReturnType<InlineBlockNode['exportJSON']>;
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isInlineBlockNode(node)) throw new Error('expected InlineBlockNode');
      exported = node.exportJSON();
    });

    expect(exported).toMatchObject({
      type: INLINE_BLOCK_NODE_TYPE,
      version: 1,
      componentId: 'icon',
      data: { label: 'star', size: 24 },
      blockKey: 'pt-key-1',
    });

    editor.update(
      () => {
        const imported = InlineBlockNode.importJSON(exported);

        expect(imported.getComponentId()).toBe('icon');
        expect(imported.getData()).toEqual({ label: 'star', size: 24 });
        expect(imported.getBlockKey()).toBe('pt-key-1');
        expect(imported.getType()).toBe(INLINE_BLOCK_NODE_TYPE);
      },
      { discrete: true },
    );
  });

  it('exportJSON omits blockKey when it was never set', () => {
    const editor = createHeadlessEditor([InlineBlockNode]);
    let exported!: ReturnType<InlineBlockNode['exportJSON']>;

    editor.update(
      () => {
        const node = $createInlineBlockNode('icon', { label: 'star' });
        exported = node.exportJSON();
      },
      { discrete: true },
    );

    expect(exported).not.toHaveProperty('blockKey');
    expect(exported.componentId).toBe('icon');
    expect(exported.data).toEqual({ label: 'star' });
  });

  it('clone preserves state and produces a distinct instance sharing the same key', () => {
    const editor = createHeadlessEditor([InlineBlockNode]);

    editor.update(
      () => {
        const original = $createInlineBlockNode('icon', { label: 'star' }, 'pt-key-2');
        const cloned = InlineBlockNode.clone(original);

        expect(cloned).not.toBe(original);
        expect(cloned.__key).toBe(original.__key);
        expect(cloned.getComponentId()).toBe(original.getComponentId());
        expect(cloned.getData()).toEqual(original.getData());
        expect(cloned.getBlockKey()).toBe(original.getBlockKey());
      },
      { discrete: true },
    );
  });
});
