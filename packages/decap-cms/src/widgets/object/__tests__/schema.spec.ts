import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import objectSchema from '@/widgets/object/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('object widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { object: objectSchema },
  };

  it('accepts a valid object field config with a summary template', () => {
    const fieldConfig = {
      name: 'address',
      widget: 'object',
      collapsed: true,
      summary: '{{fields.city}}',
      fields: [{ name: 'city', widget: 'string' }],
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects summary with the wrong type', () => {
    const fieldConfig = {
      name: 'address',
      widget: 'object',
      summary: 123,
      fields: [{ name: 'city', widget: 'string' }],
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects an object field with neither fields nor field', () => {
    expect(validateJSONSchema(fieldSchema, { name: 'address', widget: 'object' })).not.toEqual([]);
  });

  it('accepts an object field with fields', () => {
    const fieldConfig = { name: 'address', widget: 'object', fields: [{ name: 'city' }] };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts an object field with a single field', () => {
    const fieldConfig = { name: 'address', widget: 'object', field: { name: 'city' } };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });
});
