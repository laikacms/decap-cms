import { $getNodeByKey, $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';

import { $createBlockNode, $isBlockNode, BLOCK_NODE_TYPE, BlockNode } from '@/lib/richtext/blocks/BlockNode';
import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';

import type { LexicalEditor, NodeKey } from 'lexical';

/**
 * DCMS-2013: `BlockNode` is the block-level Lexical `DecoratorNode` carrying
 * a Portable Text block object (`componentId`, `data`, `blockKey`) through
 * the PT <-> Lexical round-trip. Mirrors the serialization coverage style
 * used for `InlineBlockNode` in `InlineBlockNode.spec.ts`. Node
 * construction/clone must run inside `editor.update()`/
 * `editor.getEditorState().read()` — Lexical's `LexicalNode` constructor
 * calls `$setNodeKey`, which requires an active editor context.
 */

function insertBlock(
  editor: LexicalEditor,
  componentId = 'youtube',
  data: Record<string, unknown> = { url: 'https://youtu.be/abc' },
  blockKey?: string,
): NodeKey {
  let key = '';
  editor.update(
    () => {
      const node = $createBlockNode(componentId, data, blockKey);
      $getRoot().append(node);
      key = node.getKey();
    },
    { discrete: true },
  );
  return key;
}

describe('BlockNode', () => {
  it('getType() returns BLOCK_NODE_TYPE', () => {
    expect(BlockNode.getType()).toBe(BLOCK_NODE_TYPE);
    expect(BLOCK_NODE_TYPE).toBe('decap-block');
  });

  it('construction exposes componentId, data, and blockKey via getters', () => {
    const editor = createHeadlessEditor([BlockNode]);
    const nodeKey = insertBlock(editor, 'youtube', { url: 'https://youtu.be/xyz' }, 'pt-key-0');

    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isBlockNode(node)) throw new Error('expected BlockNode');
      expect(node.getComponentId()).toBe('youtube');
      expect(node.getData()).toEqual({ url: 'https://youtu.be/xyz' });
      expect(node.getBlockKey()).toBe('pt-key-0');
      expect(node.isInline()).toBe(false);
    });
  });

  it('exportJSON/importJSON round-trip preserves componentId, data, and blockKey', () => {
    const editor = createHeadlessEditor([BlockNode]);
    const nodeKey = insertBlock(editor, 'youtube', { url: 'https://youtu.be/abc', autoplay: true }, 'pt-key-1');

    let exported!: ReturnType<BlockNode['exportJSON']>;
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isBlockNode(node)) throw new Error('expected BlockNode');
      exported = node.exportJSON();
    });

    expect(exported).toMatchObject({
      type: BLOCK_NODE_TYPE,
      version: 1,
      componentId: 'youtube',
      data: { url: 'https://youtu.be/abc', autoplay: true },
      blockKey: 'pt-key-1',
    });

    editor.update(
      () => {
        const imported = BlockNode.importJSON(exported);

        expect(imported.getComponentId()).toBe('youtube');
        expect(imported.getData()).toEqual({ url: 'https://youtu.be/abc', autoplay: true });
        expect(imported.getBlockKey()).toBe('pt-key-1');
        expect(imported.getType()).toBe(BLOCK_NODE_TYPE);
      },
      { discrete: true },
    );
  });

  it('exportJSON omits blockKey when it was never set', () => {
    const editor = createHeadlessEditor([BlockNode]);
    let exported!: ReturnType<BlockNode['exportJSON']>;

    editor.update(
      () => {
        const node = $createBlockNode('youtube', { url: 'https://youtu.be/abc' });
        exported = node.exportJSON();
      },
      { discrete: true },
    );

    expect(exported).not.toHaveProperty('blockKey');
    expect(exported.componentId).toBe('youtube');
    expect(exported.data).toEqual({ url: 'https://youtu.be/abc' });
  });

  it('$createBlockNode defaults data to {} when omitted', () => {
    const editor = createHeadlessEditor([BlockNode]);

    editor.update(
      () => {
        const node = $createBlockNode('spacer');
        expect(node.getData()).toEqual({});
        expect(node.getBlockKey()).toBeUndefined();
      },
      { discrete: true },
    );
  });

  it('clone preserves state and produces a distinct instance sharing the same key', () => {
    const editor = createHeadlessEditor([BlockNode]);

    editor.update(
      () => {
        const original = $createBlockNode('youtube', { url: 'https://youtu.be/abc' }, 'pt-key-2');
        const cloned = BlockNode.clone(original);

        expect(cloned).not.toBe(original);
        expect(cloned.__key).toBe(original.__key);
        expect(cloned.getComponentId()).toBe(original.getComponentId());
        expect(cloned.getData()).toEqual(original.getData());
        expect(cloned.getBlockKey()).toBe(original.getBlockKey());
      },
      { discrete: true },
    );
  });

  it('setData writes through and is visible via getData on the latest version', () => {
    const editor = createHeadlessEditor([BlockNode]);
    const nodeKey = insertBlock(editor, 'youtube', { url: 'https://youtu.be/old' });

    editor.update(
      () => {
        const node = $getNodeByKey(nodeKey);
        if (!$isBlockNode(node)) throw new Error('expected BlockNode');
        node.setData({ url: 'https://youtu.be/new' });
      },
      { discrete: true },
    );

    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isBlockNode(node)) throw new Error('expected BlockNode');
      expect(node.getData()).toEqual({ url: 'https://youtu.be/new' });
    });
  });

  it('$isBlockNode distinguishes BlockNode instances from other nodes', () => {
    const editor = createHeadlessEditor([BlockNode]);

    editor.update(
      () => {
        const root = $getRoot();
        expect($isBlockNode(root)).toBe(false);
        expect($isBlockNode(null)).toBe(false);
        expect($isBlockNode(undefined)).toBe(false);

        const node = $createBlockNode('youtube');
        expect($isBlockNode(node)).toBe(true);
      },
      { discrete: true },
    );
  });
});
