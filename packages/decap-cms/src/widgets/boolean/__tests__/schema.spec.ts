import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import booleanSchema from '@/widgets/boolean/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('boolean widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { boolean: booleanSchema },
  };

  it('accepts a field config with default true', () => {
    const fieldConfig = { name: 'featured', widget: 'boolean', default: true };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts a field config with default false', () => {
    const fieldConfig = { name: 'featured', widget: 'boolean', default: false };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts a field config without a default', () => {
    const fieldConfig = { name: 'featured', widget: 'boolean' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects a default with the wrong type', () => {
    const fieldConfig = { name: 'featured', widget: 'boolean', default: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects a numeric default', () => {
    const fieldConfig = { name: 'featured', widget: 'boolean', default: 1 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
