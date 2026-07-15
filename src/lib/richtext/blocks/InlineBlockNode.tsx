import {
  DecoratorNode,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';

import { BlockComponent } from './BlockComponent';

import type { ReactNode } from 'react';
import type { BlockData } from './types';

/** Lexical's `_type` discriminator for inline custom objects. */
export const INLINE_BLOCK_NODE_TYPE = 'decap-inline-block';

/** Serialized form of an {@link InlineBlockNode}. */
export type SerializedInlineBlockNode = Spread<
  { componentId: string, data: BlockData, blockKey?: string },
  SerializedLexicalNode
>;

/**
 * The inline counterpart of `BlockNode`: a Lexical `DecoratorNode` embedding
 * a custom, data-carrying Portable Text *inline object* (an image or embed
 * inside a paragraph or list item, …) identified by `componentId`.
 *
 * Portable Text allows arbitrary typed objects alongside spans in a text
 * block's `children`; this node is their in-editor representation, so they
 * survive the PT <-> Lexical round-trip instead of being dropped.
 */
export class InlineBlockNode extends DecoratorNode<ReactNode> {
  __componentId: string;
  __data: BlockData;
  /** The Portable Text `_key` this object arrived with, if any. */
  __blockKey?: string;

  constructor(componentId: string, data: BlockData = {}, blockKey?: string, key?: NodeKey) {
    super(key);
    this.__componentId = componentId;
    this.__data = data;
    this.__blockKey = blockKey;
  }

  static getType(): string {
    return INLINE_BLOCK_NODE_TYPE;
  }

  static clone(node: InlineBlockNode): InlineBlockNode {
    return new InlineBlockNode(node.__componentId, node.__data, node.__blockKey, node.__key);
  }

  static importJSON(serialized: SerializedInlineBlockNode): InlineBlockNode {
    return $createInlineBlockNode(serialized.componentId, serialized.data, serialized.blockKey);
  }

  exportJSON(): SerializedInlineBlockNode {
    return {
      ...super.exportJSON(),
      type: INLINE_BLOCK_NODE_TYPE,
      version: 1,
      componentId: this.__componentId,
      data: this.__data,
      ...(this.__blockKey !== undefined ? { blockKey: this.__blockKey } : {}),
    };
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'contents';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getComponentId(): string {
    return this.getLatest().__componentId;
  }

  getData(): BlockData {
    return this.getLatest().__data;
  }

  setData(data: BlockData): void {
    this.getWritable().__data = data;
  }

  getBlockKey(): string | undefined {
    return this.getLatest().__blockKey;
  }

  isInline(): true {
    return true;
  }

  decorate(): ReactNode {
    return (
      <BlockComponent
        componentId={this.getComponentId()}
        data={this.getData()}
        nodeKey={this.getKey()}
        inline
      />
    );
  }
}

/** Create an {@link InlineBlockNode}. */
export function $createInlineBlockNode(
  componentId: string,
  data: BlockData = {},
  blockKey?: string,
): InlineBlockNode {
  return new InlineBlockNode(componentId, data, blockKey);
}

/** Type guard for {@link InlineBlockNode}. */
export function $isInlineBlockNode(node: LexicalNode | null | undefined): node is InlineBlockNode {
  return node instanceof InlineBlockNode;
}
