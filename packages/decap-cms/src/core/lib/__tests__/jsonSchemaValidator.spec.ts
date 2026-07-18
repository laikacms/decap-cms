import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('validateJSONSchema', () => {
  it('returns no errors for a valid value', () => {
    const schema: JSONSchema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
      },
    };

    expect(validateJSONSchema(schema, { name: 'foo' })).toEqual([]);
  });

  it('flags a wrong type and stops checking further keywords on that node', () => {
    const schema: JSONSchema = { type: 'string', minLength: 5 };

    const errors = validateJSONSchema(schema, 42);

    expect(errors).toEqual([
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'type',
        params: { type: 'string' },
        message: 'must be string',
      },
    ]);
  });

  it('accepts an array of types', () => {
    const schema: JSONSchema = { type: ['string', 'number'] };

    expect(validateJSONSchema(schema, 'foo')).toEqual([]);
    expect(validateJSONSchema(schema, 1)).toEqual([]);

    const errors = validateJSONSchema(schema, true);
    expect(errors).toEqual([
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'type',
        params: { type: 'string,number' },
        message: 'must be string,number',
      },
    ]);
  });

  it('flags a value not in enum', () => {
    const schema: JSONSchema = { enum: ['a', 'b'] };

    const errors = validateJSONSchema(schema, 'c');

    expect(errors).toEqual([
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'enum',
        params: { allowedValues: ['a', 'b'] },
        message: 'must be equal to one of the allowed values',
      },
    ]);
  });

  it('passes enum for a deep-equal value', () => {
    const schema: JSONSchema = { enum: [{ a: 1 }] };

    expect(validateJSONSchema(schema, { a: 1 })).toEqual([]);
  });

  it('flags instanceof when value is not a matching RegExp', () => {
    const schema: JSONSchema = { instanceof: 'RegExp' };

    expect(validateJSONSchema(schema, /foo/)).toEqual([]);

    const errors = validateJSONSchema(schema, 'foo');
    expect(errors).toEqual([
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'instanceof',
        params: {},
        message: 'must pass "instanceof" keyword validation',
      },
    ]);
  });

  describe('object keywords', () => {
    it('flags a missing required property', () => {
      const schema: JSONSchema = { type: 'object', required: ['name'] };

      const errors = validateJSONSchema(schema, {});

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'required',
          params: { missingProperty: 'name' },
          message: "must have required property 'name'",
        },
      ]);
    });

    it('validates nested properties at a nested instancePath', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
      };

      const errors = validateJSONSchema(schema, { name: 42 });

      expect(errors).toEqual([
        {
          instancePath: '/name',
          schemaPath: '',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        },
      ]);
    });

    it('flags additional properties when additionalProperties is false', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: false,
      };

      const errors = validateJSONSchema(schema, { name: 'foo', extra: 1 });

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'extra' },
          message: 'must NOT have additional properties',
        },
      ]);
    });

    it('flags fewer than minProperties', () => {
      const schema: JSONSchema = { type: 'object', minProperties: 2 };

      const errors = validateJSONSchema(schema, { a: 1 });

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'minProperties',
          params: { limit: 2 },
          message: 'must NOT have fewer than 2 properties',
        },
      ]);
    });

    it('applies a dependency schema against the whole object when the key is present', () => {
      const schema: JSONSchema = {
        type: 'object',
        dependencies: {
          credit_card: { required: ['billing_address'] },
        },
      };

      expect(validateJSONSchema(schema, {})).toEqual([]);

      const errors = validateJSONSchema(schema, { credit_card: '1234' });

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'required',
          params: { missingProperty: 'billing_address' },
          message: "must have required property 'billing_address'",
        },
      ]);
    });
  });

  describe('array keywords', () => {
    it('flags fewer than minItems', () => {
      const schema: JSONSchema = { type: 'array', minItems: 2 };

      const errors = validateJSONSchema(schema, [1]);

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'minItems',
          params: { limit: 2 },
          message: 'must NOT have fewer than 2 items',
        },
      ]);
    });

    it('flags more than maxItems', () => {
      const schema: JSONSchema = { type: 'array', maxItems: 1 };

      const errors = validateJSONSchema(schema, [1, 2]);

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'maxItems',
          params: { limit: 1 },
          message: 'must NOT have more than 1 items',
        },
      ]);
    });

    it('validates each item against a single items schema', () => {
      const schema: JSONSchema = { type: 'array', items: { type: 'string' } };

      const errors = validateJSONSchema(schema, ['a', 1]);

      expect(errors).toEqual([
        {
          instancePath: '/1',
          schemaPath: '',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        },
      ]);
    });

    it('validates tuple items positionally when items is an array', () => {
      const schema: JSONSchema = {
        type: 'array',
        items: [{ type: 'string' }, { type: 'number' }],
      };

      expect(validateJSONSchema(schema, ['a', 1])).toEqual([]);

      const errors = validateJSONSchema(schema, ['a', 'b']);

      expect(errors).toEqual([
        {
          instancePath: '/1',
          schemaPath: '',
          keyword: 'type',
          params: { type: 'number' },
          message: 'must be number',
        },
      ]);
    });

    it('flags duplicate items when uniqueItems is true', () => {
      const schema: JSONSchema = { type: 'array', uniqueItems: true };

      const errors = validateJSONSchema(schema, [1, 2, 1]);

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'uniqueItems',
          params: { i: 2, j: 0 },
          message: 'must NOT have duplicate items (items ## 0 and 2 are identical)',
        },
      ]);
    });

    it('flags duplicate values for uniqueItemProperties', () => {
      const schema: JSONSchema = {
        type: 'array',
        uniqueItemProperties: ['name'],
      };

      const errors = validateJSONSchema(schema, [{ name: 'a' }, { name: 'a' }]);

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'uniqueItemProperties',
          params: { uniqueItemProperties: ['name'] },
          message: 'must pass "uniqueItemProperties" keyword validation',
        },
      ]);
    });
  });

  describe('string keywords', () => {
    it('flags fewer than minLength', () => {
      const schema: JSONSchema = { type: 'string', minLength: 3 };

      const errors = validateJSONSchema(schema, 'ab');

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'minLength',
          params: { limit: 3 },
          message: 'must NOT have fewer than 3 characters',
        },
      ]);
    });

    it('flags more than maxLength', () => {
      const schema: JSONSchema = { type: 'string', maxLength: 2 };

      const errors = validateJSONSchema(schema, 'abc');

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'maxLength',
          params: { limit: 2 },
          message: 'must NOT have more than 2 characters',
        },
      ]);
    });

    it('flags a value that does not match pattern', () => {
      const schema: JSONSchema = { type: 'string', pattern: '^[a-z]+$' };

      const errors = validateJSONSchema(schema, 'ABC');

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'pattern',
          params: { pattern: '^[a-z]+$' },
          message: 'must match pattern "^[a-z]+$"',
        },
      ]);
    });
  });

  describe('number keywords', () => {
    it('flags a value below minimum', () => {
      const schema: JSONSchema = { type: 'number', minimum: 10 };

      const errors = validateJSONSchema(schema, 5);

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'minimum',
          params: { limit: 10 },
          message: 'must be >= 10',
        },
      ]);
    });

    it('flags a value above maximum', () => {
      const schema: JSONSchema = { type: 'number', maximum: 10 };

      const errors = validateJSONSchema(schema, 15);

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'maximum',
          params: { limit: 10 },
          message: 'must be <= 10',
        },
      ]);
    });
  });

  describe('combinators', () => {
    it('flags a value that matches "not"', () => {
      const schema: JSONSchema = { not: { type: 'string' } };

      expect(validateJSONSchema(schema, 1)).toEqual([]);

      const errors = validateJSONSchema(schema, 'foo');

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

    it('applies the "then" branch when "if" passes', () => {
      const schema: JSONSchema = {
        if: { type: 'string' },
        then: { minLength: 3 },
        else: { minimum: 10 },
      };

      expect(validateJSONSchema(schema, 'abc')).toEqual([]);

      const errors = validateJSONSchema(schema, 'ab');

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'minLength',
          params: { limit: 3 },
          message: 'must NOT have fewer than 3 characters',
        },
      ]);
    });

    it('applies the "else" branch when "if" fails', () => {
      const schema: JSONSchema = {
        if: { type: 'string' },
        then: { minLength: 3 },
        else: { minimum: 10 },
      };

      expect(validateJSONSchema(schema, 20)).toEqual([]);

      const errors = validateJSONSchema(schema, 5);

      expect(errors).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'minimum',
          params: { limit: 10 },
          message: 'must be >= 10',
        },
      ]);
    });

    it('flags a value matching zero or more than one oneOf branch', () => {
      const schema: JSONSchema = {
        oneOf: [{ type: 'string' }, { type: 'number' }],
      };

      expect(validateJSONSchema(schema, 'foo')).toEqual([]);

      const noMatch = validateJSONSchema(schema, true);
      expect(noMatch[noMatch.length - 1]).toEqual({
        instancePath: '',
        schemaPath: '',
        keyword: 'oneOf',
        params: { passingSchemas: 0 },
        message: 'must match exactly one schema in oneOf',
      });

      const bothMatch = validateJSONSchema({ oneOf: [{ minimum: 0 }, { maximum: 100 }] }, 50);
      expect(bothMatch).toEqual([
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'oneOf',
          params: { passingSchemas: 2 },
          message: 'must match exactly one schema in oneOf',
        },
      ]);
    });

    it('flags a value matching none of the anyOf branches', () => {
      const schema: JSONSchema = {
        anyOf: [{ type: 'string' }, { type: 'number' }],
      };

      expect(validateJSONSchema(schema, 'foo')).toEqual([]);
      expect(validateJSONSchema(schema, 1)).toEqual([]);

      const errors = validateJSONSchema(schema, true);

      expect(errors[errors.length - 1]).toEqual({
        instancePath: '',
        schemaPath: '',
        keyword: 'anyOf',
        params: {},
        message: 'must match a schema in anyOf',
      });
    });
  });

  describe('widgets', () => {
    it('validates an object with a matching widget schema', () => {
      const schema: JSONSchema = {
        widgets: {
          string: { properties: { default: { type: 'string' } } },
        },
      };

      expect(validateJSONSchema(schema, { widget: 'string', default: 'foo' })).toEqual([]);

      const errors = validateJSONSchema(schema, { widget: 'string', default: 1 });

      expect(errors).toEqual([
        {
          instancePath: '/default',
          schemaPath: '',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        },
      ]);
    });

    it('ignores widgets with no matching schema entry', () => {
      const schema: JSONSchema = { widgets: { string: { type: 'string' } } };

      expect(validateJSONSchema(schema, { widget: 'unknown' })).toEqual([]);
    });
  });
});
