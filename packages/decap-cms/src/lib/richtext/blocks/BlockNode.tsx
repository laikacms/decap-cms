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

/** Lexical's `_type` discriminator for custom blocks. */
export const BLOCK_NODE_TYPE = 'decap-block';

/** Serialized form of a {@link BlockNode}. */
export type SerializedBlockNode = Spread<
  { componentId: string, data: BlockData, blockKey?: string },
  SerializedLexicalNode
>;

/**
 * A Lexical `DecoratorNode` embedding a custom, data-carrying block
 * (shortcodes, embeds, code blocks, …) identified by `componentId`.
 */
export class BlockNode extends DecoratorNode<ReactNode> {
  __componentId: string;
  __data: BlockData;
  /** The Portable Text `_key` this block arrived with, if any. */
  __blockKey?: string;

  constructor(componentId: string, data: BlockData = {}, blockKey?: string, key?: NodeKey) {
    super(key);
    this.__componentId = componentId;
    this.__data = data;
    this.__blockKey = blockKey;
  }

  static getType(): string {
    return BLOCK_NODE_TYPE;
  }

  static clone(node: BlockNode): BlockNode {
    return new BlockNode(node.__componentId, node.__data, node.__blockKey, node.__key);
  }

  static importJSON(serialized: SerializedBlockNode): BlockNode {
    return $createBlockNode(serialized.componentId, serialized.data, serialized.blockKey);
  }

  exportJSON(): SerializedBlockNode {
    return {
      ...super.exportJSON(),
      type: BLOCK_NODE_TYPE,
      version: 1,
      componentId: this.__componentId,
      data: this.__data,
      ...(this.__blockKey !== undefined ? { blockKey: this.__blockKey } : {}),
    };
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'contents';
    return div;
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

  isInline(): false {
    return false;
  }

  decorate(): ReactNode {
    return (
      <BlockComponent
        componentId={this.getComponentId()}
        data={this.getData()}
        nodeKey={this.getKey()}
      />
    );
  }
}

/** Create a {@link BlockNode}. */
export function $createBlockNode(
  componentId: string,
  data: BlockData = {},
  blockKey?: string,
): BlockNode {
  return new BlockNode(componentId, data, blockKey);
}

/** Type guard for {@link BlockNode}. */
export function $isBlockNode(node: LexicalNode | null | undefined): node is BlockNode {
  return node instanceof BlockNode;
}
