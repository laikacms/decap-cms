import { getBlock, listBlocks } from './registry';

import type { BlockDefinition } from './types';

/**
 * The blocks available to one richtext field, keyed by id.
 *
 * A field config may carry `blocks: [ids]` as an allowlist; without it every
 * registered block is available. This filter is UI-only (insertion/picker):
 * parsing always recognizes all registered codecs so content never breaks.
 */
export function resolveBlocksForField(field: { blocks?: unknown }): Record<string, BlockDefinition> {
  const allowlist = Array.isArray(field.blocks)
    ? field.blocks.filter((id): id is string => typeof id === 'string')
    : undefined;

  const resolved: Record<string, BlockDefinition> = {};
  if (allowlist) {
    for (const id of allowlist) {
      const definition = getBlock(id);
      if (definition) resolved[id] = definition;
      else console.warn(`[richtext] field allows unknown block "${id}"; is it registered?`);
    }
  } else {
    for (const definition of listBlocks()) resolved[definition.id] = definition;
  }
  return resolved;
}
