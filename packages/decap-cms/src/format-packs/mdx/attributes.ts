import type { MdxJsxAttribute, MdxJsxExpressionAttribute } from 'mdast-util-mdx-jsx';

/**
 * The opaque wrapper for a JSX attribute expression that is not strict JSON.
 * The `value` is the verbatim expression source (no braces); it is never
 * evaluated and round-trips verbatim.
 */
export interface MdxExpressionValue {
  _type: 'mdx-expression';
  value: string;
}

export function isMdxExpressionValue(value: unknown): value is MdxExpressionValue {
  return (
    typeof value === 'object'
    && value !== null
    && (value as { _type?: unknown })._type === 'mdx-expression'
    && typeof (value as { value?: unknown }).value === 'string'
  );
}

export type ParsedAttributes =
  | { ok: true, data: Record<string, unknown> }
  | { ok: false };

/** Props that would clobber PT bookkeeping or the children convention. */
function isReservedName(name: string): boolean {
  return name === 'children' || name.startsWith('_');
}

/**
 * Convert a JSX element's attributes to block data:
 * quoted string -> string, shorthand -> `true`, expression -> strict
 * `JSON.parse` attempt, else an opaque {@link MdxExpressionValue} (never
 * eval).
 *
 * Returns `{ok: false}` when the element cannot be represented as structured
 * data (spread attributes, reserved prop names) — the caller then keeps the
 * whole element as an opaque `mdx-jsx` block.
 */
export function parseJsxAttributes(
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>,
): ParsedAttributes {
  const data: Record<string, unknown> = {};
  for (const attribute of attributes) {
    if (attribute.type !== 'mdxJsxAttribute') return { ok: false }; // {...spread}
    if (isReservedName(attribute.name)) return { ok: false };

    const { name, value } = attribute;
    if (value == null) {
      data[name] = true; // shorthand attribute
    } else if (typeof value === 'string') {
      data[name] = value;
    } else {
      data[name] = parseAttributeExpression(value.value);
    }
  }
  return { ok: true, data };
}

function parseAttributeExpression(expression: string): unknown {
  try {
    return JSON.parse(expression);
  } catch {
    return { _type: 'mdx-expression', value: expression } satisfies MdxExpressionValue;
  }
}

/** A string is emittable as a quoted JSX attribute iff reparsing decodes it
 * identically: no quotes, no newlines, and no character references. */
function isPlainAttributeString(value: string): boolean {
  return !/["&\n\r]/.test(value);
}

/**
 * Serialize block data to JSX attribute source (leading space included when
 * non-empty). Reserved props (`children`, `_*`) are skipped — `children` is
 * emitted as element children by the caller.
 */
export function serializeJsxAttributes(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(data)) {
    if (isReservedName(name) || value === undefined) continue;
    if (value === true) {
      parts.push(name);
    } else if (typeof value === 'string' && isPlainAttributeString(value)) {
      parts.push(`${name}="${value}"`);
    } else if (isMdxExpressionValue(value)) {
      parts.push(`${name}={${value.value}}`);
    } else {
      // Strict-JSON expression: reparses via JSON.parse to the same value.
      parts.push(`${name}={${JSON.stringify(value)}}`);
    }
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}
