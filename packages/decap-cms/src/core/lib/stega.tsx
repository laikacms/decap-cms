import { vercelStegaEncode } from '@vercel/stega';

import type { CmsField } from '@/lib/util/index';

/**
 * Context passed to encode functions, containing the current state of the encoding process
 */
interface EncodeContext {
  fields: CmsField[]; // Available CMS fields at current level
  path: string; // Path to current value in object tree
  visit: (value: unknown, fields: CmsField[], path: string) => unknown; // Visitor for recursive traversal
}

/**
 * Whether a value is a plain object (`{}` / `Object.create(null)`) as opposed
 * to a class instance like `Date` or `RegExp`. Only plain objects represent
 * nested field maps worth traversing; spreading a non-plain object (e.g.
 * `{ ...date }`) would strip it to `{}` and destroy the value.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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
 * Encode a string value by appending steganographic data.
 *
 * `richtext` (and its deprecated `markdown` alias) fields are deliberately
 * excluded (DCMS-1325): their raw string is markdown source that still has
 * to pass through the markdown -> Portable Text -> preview-HTML pipeline.
 * Appending a stega block per paragraph, as used to happen here, survives
 * that pipeline as literal zero-width characters (ZWSP/ZWNJ/ZWJ/BOM) sitting
 * inside the rendered preview's flowing prose text nodes, invisible on
 * screen, but present in `innerHTML`/`textContent` for every paragraph of
 * real article content. That poisons copy-paste out of the preview, adds
 * screen-reader noise, and makes the preview diverge from what a reader of
 * the rendered content would ever see. Scalar `string`/`text` fields don't
 * have this problem: they render as a single opaque value (e.g. a title),
 * so click-to-edit there stays intact.
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
  return value;
}

/**
 * Encode an array of values, handling both simple values and nested objects/lists
 * For typed lists, use the type field to determine which fields to use
 */
function encodeList(list: unknown[], ctx: EncodeContext): unknown[] {
  const newList = [...list];
  for (let i = 0; i < newList.length; i++) {
    const item = newList[i];
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      const itemRecord = item as Record<string, unknown>;
      const itemType = itemRecord['type'];
      if (typeof itemType === 'string') {
        // For typed items, look up fields based on type
        const field = ctx.fields.find(f => f.name === itemType);
        newList[i] = ctx.visit(item, getNestedFields(field), `${ctx.path}.${i}`);
      } else {
        // For untyped items, use current fields
        newList[i] = ctx.visit(item, ctx.fields, `${ctx.path}.${i}`);
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
      const newVal = ctx.visit(val, fields, ctx.path ? `${ctx.path}.${key}` : key);
      if (newVal !== val) {
        newMap[key] = newVal;
      }
    }
  }
  return newMap;
}

/**
 * Cache for encoded values to prevent re-encoding unchanged values
 * across keystrokes. The cache is keyed by path.
 */
const encodingCache = new Map();

/**
 * Main entry point for encoding steganographic data into entry values
 * Uses a visitor pattern with caching to handle recursive structures
 */
export function encodeEntry(value: unknown, fields: CmsField[]) {
  const plainFields = fields;

  function visit(value: unknown, fields: CmsField[], path = '') {
    const cached = encodingCache.get(path);
    if (cached === value) return value;

    const ctx: EncodeContext = { fields, path, visit };
    let result;
    if (Array.isArray(value)) {
      result = encodeList(value, ctx);
    } else if (isPlainObject(value)) {
      result = encodeMap(value, ctx);
    } else if (typeof value === 'string') {
      result = encodeString(value, ctx);
    } else {
      result = value;
    }

    encodingCache.set(path, result);
    return result;
  }

  return visit(value, plainFields);
}
