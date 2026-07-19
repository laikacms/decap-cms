import { describe, expect, it } from 'vitest';

import { isMdxExpressionValue, parseJsxAttributes } from '@/format-packs/mdx/attributes';

import type { MdxJsxAttribute, MdxJsxExpressionAttribute } from 'mdast-util-mdx-jsx';

/**
 * `attributes.ts` is the JSX attribute <-> block-data bridge for the MDX
 * format pack. It has no test coverage anywhere under `format-packs/mdx/`,
 * so a regression to `isReservedName`, the value-kind dispatch in
 * `parseAttributeExpression`, or the spread/reserved-name bail-out would
 * silently corrupt persisted block data.
 */

function stringAttr(name: string, value: string): MdxJsxAttribute {
  return { type: 'mdxJsxAttribute', name, value };
}

function shorthandAttr(name: string): MdxJsxAttribute {
  return { type: 'mdxJsxAttribute', name, value: null };
}

function expressionAttr(name: string, expression: string): MdxJsxAttribute {
  return {
    type: 'mdxJsxAttribute',
    name,
    value: { type: 'mdxJsxAttributeValueExpression', value: expression },
  };
}

function spreadAttr(expression: string): MdxJsxExpressionAttribute {
  return { type: 'mdxJsxExpressionAttribute', value: expression };
}

describe('isMdxExpressionValue', () => {
  it('is true for a well-formed MdxExpressionValue', () => {
    expect(isMdxExpressionValue({ _type: 'mdx-expression', value: 'a + b' })).toBe(true);
  });

  it('is false for null', () => {
    expect(isMdxExpressionValue(null)).toBe(false);
  });

  it('is false for a non-object primitive', () => {
    expect(isMdxExpressionValue('mdx-expression')).toBe(false);
    expect(isMdxExpressionValue(42)).toBe(false);
  });

  it('is false when _type is missing or wrong', () => {
    expect(isMdxExpressionValue({ value: 'a + b' })).toBe(false);
    expect(isMdxExpressionValue({ _type: 'something-else', value: 'a + b' })).toBe(false);
  });

  it('is false when value is not a string', () => {
    expect(isMdxExpressionValue({ _type: 'mdx-expression', value: 1 })).toBe(false);
    expect(isMdxExpressionValue({ _type: 'mdx-expression' })).toBe(false);
  });
});

describe('parseJsxAttributes value kinds', () => {
  it('converts a quoted string attribute to a plain string', () => {
    const result = parseJsxAttributes([stringAttr('title', 'Hello world')]);
    expect(result).toEqual({ ok: true, data: { title: 'Hello world' } });
  });

  it('converts a shorthand attribute (no value) to `true`', () => {
    const result = parseJsxAttributes([shorthandAttr('disabled')]);
    expect(result).toEqual({ ok: true, data: { disabled: true } });
  });

  it('parses a valid JSON expression attribute into its decoded value', () => {
    const result = parseJsxAttributes([expressionAttr('count', '42')]);
    expect(result).toEqual({ ok: true, data: { count: 42 } });
  });

  it('parses a valid JSON object/array expression', () => {
    const result = parseJsxAttributes([expressionAttr('items', '[1,2,3]')]);
    expect(result).toEqual({ ok: true, data: { items: [1, 2, 3] } });
  });

  it('wraps a non-JSON opaque expression as an MdxExpressionValue', () => {
    const result = parseJsxAttributes([expressionAttr('onClick', 'handleClick()')]);
    expect(result).toEqual({
      ok: true,
      data: { onClick: { _type: 'mdx-expression', value: 'handleClick()' } },
    });
    if (result.ok) {
      expect(isMdxExpressionValue(result.data.onClick)).toBe(true);
    }
  });

  it('mixes value kinds across multiple attributes on one element', () => {
    const result = parseJsxAttributes([
      stringAttr('title', 'Hello'),
      shorthandAttr('open'),
      expressionAttr('count', '1'),
      expressionAttr('handler', 'doThing(x)'),
    ]);
    expect(result).toEqual({
      ok: true,
      data: {
        title: 'Hello',
        open: true,
        count: 1,
        handler: { _type: 'mdx-expression', value: 'doThing(x)' },
      },
    });
  });
});

describe('parseJsxAttributes bail-out to {ok: false}', () => {
  it('bails out on a spread attribute', () => {
    const result = parseJsxAttributes([spreadAttr('...props')]);
    expect(result).toEqual({ ok: false });
  });

  it('bails out on a spread attribute mixed with plain attributes', () => {
    const result = parseJsxAttributes([stringAttr('title', 'Hello'), spreadAttr('...rest')]);
    expect(result).toEqual({ ok: false });
  });

  it('bails out on the reserved `children` prop name', () => {
    const result = parseJsxAttributes([stringAttr('children', 'nope')]);
    expect(result).toEqual({ ok: false });
  });

  it('bails out on `_`-prefixed reserved prop names', () => {
    const result = parseJsxAttributes([stringAttr('_key', 'abc123')]);
    expect(result).toEqual({ ok: false });
  });

  it('bails out as soon as a reserved name is seen, even after valid attributes', () => {
    const result = parseJsxAttributes([shorthandAttr('open'), stringAttr('_internal', 'x')]);
    expect(result).toEqual({ ok: false });
  });
});
