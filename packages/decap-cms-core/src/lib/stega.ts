import { vercelStegaEncode } from '@vercel/stega';

import { isImmutableMap, isImmutableList } from '../types/immutable';

import type { CmsField } from 'decap-cms-core';

/**
 * Context passed to encode functions, containing the current state of the encoding process
 */
interface EncodeContext {
  fields: CmsField[]; // Available CMS fields at current level
  path: string; // Path to current value in object tree
  typeKey: string; // Key used to discriminate typed list items (default: 'type')
  visit: (value: unknown, fields: CmsField[], path: string, typeKey?: string) => unknown; // Visitor for recursive traversal
}

/**
 * Get the fields that should be used for encoding nested values
 */
function getNestedFields(f?: CmsField): CmsField[] {
  if (f) {
    if ('types' in f) {
      return f.types ?? [];
    }
    if ('fields' in f) {
      return f.fields ?? [];
    }
    if ('field' in f) {
      return f.field ? [f.field] : [];
    }
    return [f];
  }
  return [];
}

/**
 * Encode a string value by appending steganographic data
 * For markdown fields, encode each paragraph separately
 */
function encodeString(value: string, { fields, path }: EncodeContext): string {
  const [field] = fields;
  if (!field) return value;
  const { widget } = field;
  if (widget === 'string' || widget === 'text') {
    if ('visualEditing' in field && field.visualEditing === false) return value;
    const stega = vercelStegaEncode({ decap: path });
    return value + stega;
  }
  if (widget === 'markdown') {
    if ('visualEditing' in field && field.visualEditing === false) return value;
    const stega = vercelStegaEncode({ decap: path });
    const blocks = value.split(/(\n\n+)/);
    return blocks.map(block => (block.trim() ? block + stega : block)).join('');
  }
  return value;
}

/**
 * Encode a list of values, handling both simple values and nested objects/lists
 * For typed lists, use the configured typeKey (defaulting to 'type') to discriminate items
 */
function encodeList(list: unknown[], ctx: EncodeContext): unknown[] {
  const typeKey = ctx.typeKey;
  const newList = list.slice();
  for (let i = 0; i < newList.length; i++) {
    const item = newList[i];
    if (isImmutableMap(item)) {
      const itemType = item[typeKey];
      if (typeof itemType === 'string') {
        // For typed items, look up fields based on type
        const field = ctx.fields.find(f => f.name === itemType);
        const newItem = ctx.visit(item, getNestedFields(field), `${ctx.path}.${i}`);
        newList[i] = newItem;
      } else {
        // For untyped items, use current fields
        const newItem = ctx.visit(item, ctx.fields, `${ctx.path}.${i}`);
        newList[i] = newItem;
      }
    } else {
      // For simple values, use first field if available
      const field = ctx.fields[0];
      const newItem = ctx.visit(item, field ? [field] : [], `${ctx.path}.${i}`);
      if (newItem !== item) {
        newList[i] = newItem;
      }
    }
  }
  return newList;
}

/**
 * Encode a map of values, looking up the appropriate field for each key
 * and recursively encoding nested values
 */
function encodeMap(map: Record<string, unknown>, ctx: EncodeContext): Record<string, unknown> {
  const newMap = { ...map };
  for (const [key, val] of Object.entries(newMap)) {
    const field = ctx.fields.find(f => f.name === key);
    if (field) {
      const fields = getNestedFields(field);
      const typeKey =
        field.widget === 'list' && 'typeKey' in field && typeof field.typeKey === 'string'
          ? field.typeKey
          : undefined;
      const newVal = ctx.visit(val, fields, ctx.path ? `${ctx.path}.${key}` : key, typeKey);
      if (newVal !== val) {
        newMap[key] = newVal;
      }
    }
  }
  return newMap;
}

/**
 * Main entry point for encoding steganographic data into entry values
 * Uses a visitor pattern with per-call caching to handle recursive structures.
 *
 * inputCache and outputCache are scoped to each encodeEntry invocation so
 * the Map never grows across calls and the cache hit check compares the
 * correct values (raw input vs cached raw input, not encoded output).
 */
export function encodeEntry(value: unknown, fields: CmsField[]) {
  const plainFields = fields;
  const inputCache = new Map<string, unknown>();
  const outputCache = new Map<string, unknown>();

  function visit(value: unknown, fields: CmsField[], path = '', typeKey = 'type') {
    if (inputCache.get(path) === value) return outputCache.get(path);

    const ctx: EncodeContext = { fields, path, typeKey, visit };
    let result;
    if (isImmutableList(value)) {
      result = encodeList(value, ctx);
    } else if (isImmutableMap(value)) {
      result = encodeMap(value, ctx);
    } else if (typeof value === 'string') {
      result = encodeString(value, ctx);
    } else {
      result = value;
    }

    inputCache.set(path, value);
    outputCache.set(path, result);
    return result;
  }

  return visit(value, plainFields);
}
