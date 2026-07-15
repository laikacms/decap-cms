import { RichtextValue } from '@/lib/richtext/RichtextValue';

import type { BlockData } from './types';

/**
 * Deep-normalize block data to plain JSON before it enters a Lexical node /
 * Portable Text: a nested `RichtextValue` (a richtext field inside a block)
 * becomes its canonical Portable Text array — NOT a serialized string — so
 * nested rich content stays PT end-to-end; functions and `undefined` are
 * dropped.
 */
export function normalizeBlockData(data: BlockData): BlockData {
  return normalizeValue(data) as BlockData;
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof RichtextValue) {
    return normalizeValue(value.portableText);
  }
  if (Array.isArray(value)) {
    return value.filter(item => item !== undefined && typeof item !== 'function').map(normalizeValue);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined || typeof item === 'function') continue;
      out[key] = normalizeValue(item);
    }
    return out;
  }
  if (typeof value === 'function') return undefined;
  return value;
}
