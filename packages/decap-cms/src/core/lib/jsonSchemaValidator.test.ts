import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from './jsonSchemaValidator';

import type { JSONSchema } from './jsonSchemaValidator';

// Complements __tests__/jsonSchemaValidator.spec.ts (added in #1000), which covers
// the happy-path branch for every supported keyword. This file focuses on
// malformed/edge-case schema and value input per DCMS-996.
describe('validateJSONSchema, edge cases', () => {
  it('returns no errors for an empty schema regardless of value', () => {
    expect(validateJSONSchema({}, 'anything')).toEqual([]);
    expect(validateJSONSchema({}, 42)).toEqual([]);
    expect(validateJSONSchema({}, null)).toEqual([]);
    expect(validateJSONSchema({}, undefined)).toEqual([]);
    expect(validateJSONSchema({}, { a: 1 })).toEqual([]);
  });

  it('ignores unknown/unsupported keywords rather than throwing', () => {
    const schema = {
      type: 'string',
      someMadeUpKeyword: { nested: true },
      format: 'email',
    } as JSONSchema;

    expect(validateJSONSchema(schema, 'foo')).toEqual([]);
  });

  it('does not validate object/array/string/number keywords against a mismatched value', () => {
    // type check fails first and short-circuits, so a numeric-only keyword like
    // `minimum` against a string value never even gets evaluated.
    const schema: JSONSchema = { type: 'number', minimum: 0, minLength: 5 };

    const errors = validateJSONSchema(schema, 'not a number');

    expect(errors).toEqual([
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'type',
        params: { type: 'number' },
        message: 'must be number',
      },
    ]);
  });

  it('treats null as neither an object nor a value matching type "object"', () => {
    const schema: JSONSchema = { type: 'object', required: ['name'] };

    const errors = validateJSONSchema(schema, null);

    expect(errors).toEqual([
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'type',
        params: { type: 'object' },
        message: 'must be object',
      },
    ]);
  });

  it('rejects an unrecognized type string for every value', () => {
    const schema: JSONSchema = { type: 'not-a-real-type' as JSONSchema['type'] };

    const errors = validateJSONSchema(schema, 'foo');

    expect(errors).toEqual([
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'type',
        params: { type: 'not-a-real-type' },
        message: 'must be not-a-real-type',
      },
    ]);
  });

  it('does not error when required is absent on an object schema', () => {
    const schema: JSONSchema = { type: 'object' };

    expect(validateJSONSchema(schema, {})).toEqual([]);
  });

  it('handles an empty required array as a no-op', () => {
    const schema: JSONSchema = { type: 'object', required: [] };

    expect(validateJSONSchema(schema, {})).toEqual([]);
  });

  it('does not validate array-only keywords against a plain object', () => {
    const schema: JSONSchema = { minItems: 5, maxItems: 1, uniqueItems: true };

    expect(validateJSONSchema(schema, { a: 1 })).toEqual([]);
  });

  it('does not validate object-only keywords against an array', () => {
    const schema: JSONSchema = { required: ['name'], additionalProperties: false };

    expect(validateJSONSchema(schema, [1, 2, 3])).toEqual([]);
  });

  it('ignores a malformed pattern-less string schema and unrelated numeric bounds', () => {
    const schema: JSONSchema = { type: 'string', minimum: 100, maximum: 0 };

    // minimum/maximum only apply to numbers, so they're silently ignored for a string.
    expect(validateJSONSchema(schema, 'short')).toEqual([]);
  });

  it('propagates the branch errors from a failing "not" schema without adding params', () => {
    // "not" only reports its own violation; it does not surface the inner schema's errors.
    const schema: JSONSchema = { type: 'string', not: { minLength: 0 } };

    const errors = validateJSONSchema(schema, 'x');

    expect(errors).toEqual([
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'not',
        params: {},
        message: 'must NOT be valid',
      },
    ]);
  });

  it('applies no branch when "if" fails and "else" is absent', () => {
    const schema: JSONSchema = { if: { type: 'string' }, then: { minLength: 100 } };

    expect(validateJSONSchema(schema, 42)).toEqual([]);
  });

  it('handles a tuple items schema shorter than the array without erroring on extra items', () => {
    const schema: JSONSchema = { type: 'array', items: [{ type: 'string' }] };

    expect(validateJSONSchema(schema, ['a', 'ignored-extra', 123])).toEqual([]);
  });

  it('handles a self-referential (circular) schema without infinite recursion for finite input', () => {
    const nodeSchema: JSONSchema = {
      type: 'object',
      properties: {
        value: { type: 'number' },
      },
    };
    nodeSchema.properties!.children = { type: 'array', items: nodeSchema };

    const validTree = { value: 1, children: [{ value: 2, children: [] }] };
    expect(validateJSONSchema(nodeSchema, validTree)).toEqual([]);

    const invalidTree = { value: 1, children: [{ value: 'not-a-number', children: [] }] };
    const errors = validateJSONSchema(nodeSchema, invalidTree);

    expect(errors).toEqual([
      {
        instancePath: '/children/0/value',
        schemaPath: '',
        keyword: 'type',
        params: { type: 'number' },
        message: 'must be number',
      },
    ]);
  });

  it('ignores uniqueItemProperties for non-plain-object array items', () => {
    const schema: JSONSchema = { type: 'array', uniqueItemProperties: ['name'] };

    expect(validateJSONSchema(schema, ['a', 'b', 1, 2])).toEqual([]);
  });

  it('ignores uniqueItemProperties when the property value is itself an object', () => {
    const schema: JSONSchema = { type: 'array', uniqueItemProperties: ['meta'] };

    // Object-valued properties are skipped for uniqueness comparison, so two
    // items with equal nested objects are not flagged as duplicates.
    expect(
      validateJSONSchema(schema, [{ meta: { a: 1 } }, { meta: { a: 1 } }]),
    ).toEqual([]);
  });

  it('does not treat an object without a "widget" string property as widget-dispatchable', () => {
    const schema: JSONSchema = {
      widgets: { string: { required: ['default'] } },
    };

    expect(validateJSONSchema(schema, { widget: 123 })).toEqual([]);
    expect(validateJSONSchema(schema, {})).toEqual([]);
  });

  // DCMS-1161 pinned this file's schema-fragment-only view of
  // `editor_components`/`editorComponents`: with no `additionalProperties:
  // false` anywhere, the bare JSON-schema interpreter accepts the key
  // silently, same as the genuinely inert keys documented next to it in the
  // richtext README. DCMS-1974 reversed the *end-to-end* outcome - a richtext
  // field that sets either key is now a hard config error - but not by
  // changing this interpreter or adding `additionalProperties: false` (that
  // remains out of scope; see DCMS-1974's "explicitly out of scope"). The
  // enforcement is a dedicated custom check, `checkRichtextFieldKeys` in
  // `validateConfig.ts` (pinned by `__tests__/validateConfig.spec.ts`'s
  // "richtext removed/inert keys (DCMS-1974)" suite), because it needs to
  // know the field's `widget` is specifically `'richtext'` and produce a
  // message naming the replacement API - neither is expressible as a schema
  // fragment here. So this test still holds: in isolation, this generic
  // interpreter has no opinion on `editor_components` at all.
  it('accepts a richtext field config with an unknown editor_components key at the schema-interpreter level (DCMS-1161, DCMS-1974)', () => {
    const richtextWidgetSchema: JSONSchema = {
      properties: {
        format: { type: 'string' },
        minimal: { type: 'boolean' },
        buttons: { type: 'array', items: { type: 'string' } },
        modes: { type: 'array', items: { type: 'string', enum: ['rich_text', 'raw'] } },
      },
    };
    const fieldSchema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        widget: { type: 'string' },
      },
      required: ['name'],
      widgets: { richtext: richtextWidgetSchema },
    };

    const fieldConfig = {
      name: 'body',
      widget: 'richtext',
      editor_components: ['image', 'code-block'],
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);

    const camelCaseFieldConfig = {
      name: 'body',
      widget: 'richtext',
      editorComponents: ['image', 'code-block'],
    };

    expect(validateJSONSchema(fieldSchema, camelCaseFieldConfig)).toEqual([]);
  });
});
