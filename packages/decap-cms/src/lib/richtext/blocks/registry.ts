import type { BlockData, BlockDefinition, BlockFormatCodec } from './types';

/**
 * PT types with built-in meaning to the mappers or the bridge; a custom block
 * may not claim them.
 */
export const RESERVED_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'block',
  'span',
  'link',
  'code',
  'image',
  'html',
  'table',
  'callout',
  'list',
  'horizontal-rule',
  'unknown',
]);

const registry = new Map<string, BlockDefinition>();

/** Set once codecs have been handed to a mapper; used for the late-registration warn. */
const consumedFormats = new Set<string>();
let warnedLateRegistration = false;

/**
 * Register a custom block. A later registration with the same `id` replaces
 * the earlier one. Throws when `id` is a reserved PT type.
 *
 * Register blocks at boot, before any entry is parsed: mappers resolve block
 * codecs lazily but `RichtextValue` parses (and caches) at construction.
 */
export function registerBlock<TData extends BlockData>(definition: BlockDefinition<TData>): void {
  if (RESERVED_BLOCK_TYPES.has(definition.id)) {
    throw new Error(
      `lib-richtext: block id "${definition.id}" is a reserved Portable Text type. `
        + `Reserved: ${[...RESERVED_BLOCK_TYPES].join(', ')}`,
    );
  }
  if (consumedFormats.size > 0 && !warnedLateRegistration) {
    warnedLateRegistration = true;
    console.warn(
      `[richtext] block "${definition.id}" was registered after a mapper already `
        + 'serialized or parsed content. Entries loaded before this registration '
        + 'will not recognize the block; register blocks at boot.',
    );
  }
  // Stored type-erased; per-block TData typing only matters at the call site.
  registry.set(definition.id, definition as unknown as BlockDefinition);
}

/** Remove a block from the registry. */
export function unregisterBlock(id: string): void {
  registry.delete(id);
}

/** True when a block with this id is registered. */
export function hasBlock(id: string): boolean {
  return registry.has(id);
}

/** Get a registered block definition, or undefined. */
export function getBlock(id: string): BlockDefinition | undefined {
  return registry.get(id);
}

/** All registered blocks, in registration order. */
export function listBlocks(): BlockDefinition[] {
  return [...registry.values()];
}

function isCodec(value: unknown): value is BlockFormatCodec {
  return (
    !!value
    && typeof value === 'object'
    && (value as BlockFormatCodec).pattern instanceof RegExp
    && typeof (value as BlockFormatCodec).fromMatch === 'function'
    && typeof (value as BlockFormatCodec).serialize === 'function'
  );
}

/**
 * The codecs that block definitions themselves declare for `formatId`, keyed
 * by block id and in registration order. Format packs layer their own codec
 * overrides on top of this (see `resolveBlockCodecs` in `../formats`).
 */
export function collectBlockOwnCodecs(formatId: string): Map<string, BlockFormatCodec<BlockData>> {
  consumedFormats.add(formatId);
  const codecs = new Map<string, BlockFormatCodec>();
  for (const definition of registry.values()) {
    const codec = definition.formats?.[formatId];
    if (isCodec(codec)) codecs.set(definition.id, codec);
  }
  return codecs;
}
