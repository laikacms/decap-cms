import { $insertNodes } from 'lexical';

import { $createBlockNode } from './BlockNode';
import { $createInlineBlockNode } from './InlineBlockNode';

import type { BlockData, BlockDefinition } from './types';

/** Resolve a definition's `defaultData` into a fresh data object. */
export function resolveDefaultData(definition: BlockDefinition): BlockData {
  const { defaultData } = definition;
  if (typeof defaultData === 'function') return defaultData();
  return { ...(defaultData ?? {}) };
}

/**
 * Insert a new block for `definition` at the current selection. Must run
 * inside `editor.update()`.
 */
export function $insertBlock(definition: BlockDefinition): void {
  const data = resolveDefaultData(definition);
  const node = definition.inline
    ? $createInlineBlockNode(definition.id, data)
    : $createBlockNode(definition.id, data);
  $insertNodes([node]);
}
