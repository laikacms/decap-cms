import { registerBlock, unregisterBlock, collectBlockOwnCodecs } from './blocks/registry';
import { registerMapper, unregisterMapper } from './registry';

import type { Klass, LexicalEditor, LexicalNode } from 'lexical';
import type { Transformer } from '@lexical/markdown';
import type { ReactNode } from 'react';
import type { BlockDefinition, BlockFormatCodec } from './blocks/types';
import type { ArbitraryTypedObject } from './portable-text';
import type { Mapper } from './types';

/** Declarative insert entry; `ui/editor` adapts it to a picker option. */
export interface EditorInsertOption {
  id: string;
  title: string;
  keywords?: string[];
  icon?: ReactNode;
  onSelect(editor: LexicalEditor): void;
}

/**
 * Lexical-side extras contributed by a format pack. Object identity must be
 * stable across renders — the editor keys its composer setup on it.
 */
export interface FormatLexicalExtras {
  nodes?: ReadonlyArray<Klass<LexicalNode>>;
  transformers?: ReadonlyArray<Transformer>;
  insertOptions?: ReadonlyArray<EditorInsertOption>;
}

/** A format pack's own block encodings. */
export interface FormatBlockSupport {
  /** Codec overrides for specific registered blocks, keyed by block id. */
  codecs?: Record<string, BlockFormatCodec>;
  /**
   * Generic fallback encoding for blocks with no codec in this format
   * (e.g. MDX emits any block as JSX). Consulted by the pack's own mapper.
   */
  encodeBlock?(definition: BlockDefinition | undefined, value: ArbitraryTypedObject): string;
}

/** Context handed to a format pack's mapper factory. */
export interface MapperFactoryContext {
  /** Lazily resolve the block codecs for this format (call at parse/serialize time). */
  resolveCodecs(): Map<string, BlockFormatCodec>;
}

/**
 * A registerable format: a Portable Text mapper plus optional Lexical-side
 * extras and block support. "Forking" markdown means registering a pack with
 * your own id, mapper, and encodings.
 */
export interface FormatPack {
  id: string;
  label?: string;
  /** A mapper, or a factory receiving the lazy block-codec resolver. */
  mapper: Mapper | ((ctx: MapperFactoryContext) => Mapper);
  lexical?: FormatLexicalExtras;
  /** Blocks bundled with the format; registered into the block registry. */
  blocks?: BlockDefinition[];
  blockSupport?: FormatBlockSupport;
}

const packs = new Map<string, FormatPack>();

/**
 * Codecs for `formatId`: every block's own `formats[formatId]` codec layered
 * over the pack's `blockSupport.codecs` overrides (a block's own codec wins).
 * Mappers call this lazily on every parse/serialize.
 */
export function resolveBlockCodecs(formatId: string): Map<string, BlockFormatCodec> {
  const resolved = new Map<string, BlockFormatCodec>();
  const packCodecs = packs.get(formatId)?.blockSupport?.codecs;
  if (packCodecs) {
    for (const [id, codec] of Object.entries(packCodecs)) resolved.set(id, codec);
  }
  for (const [id, codec] of collectBlockOwnCodecs(formatId)) resolved.set(id, codec);
  return resolved;
}

/**
 * Register a format pack: its mapper (factory resolved here), its bundled
 * blocks, and its Lexical extras. Replaces an earlier pack with the same id.
 */
export function registerFormat(pack: FormatPack): void {
  const mapper =
    typeof pack.mapper === 'function'
      ? pack.mapper({ resolveCodecs: () => resolveBlockCodecs(pack.id) })
      : pack.mapper;
  if (mapper.id !== pack.id) {
    throw new Error(
      `lib-richtext: format pack "${pack.id}" produced a mapper with mismatched id "${mapper.id}".`,
    );
  }
  registerMapper(mapper);
  for (const block of pack.blocks ?? []) registerBlock(block);
  packs.set(pack.id, pack);
}

/** Remove a format pack, its mapper, and its bundled blocks. */
export function unregisterFormat(id: string): void {
  const pack = packs.get(id);
  if (!pack) return;
  for (const block of pack.blocks ?? []) unregisterBlock(block.id);
  unregisterMapper(id);
  packs.delete(id);
}

/** Get a registered format pack, or undefined. */
export function getFormat(id: string): FormatPack | undefined {
  return packs.get(id);
}

/** All registered format packs, in registration order. */
export function listFormats(): FormatPack[] {
  return [...packs.values()];
}
