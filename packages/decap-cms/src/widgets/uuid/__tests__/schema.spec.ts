import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import uuidSchema from '@/widgets/uuid/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('uuid widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { uuid: uuidSchema },
  };

  it('accepts a valid uuid field config', () => {
    const fieldConfig = {
      name: 'id',
      widget: 'uuid',
      prefix: 'user-',
      read_only: true,
      use_b32_encoding: false,
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects prefix with the wrong type', () => {
    const fieldConfig = { name: 'id', widget: 'uuid', prefix: 123 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects read_only with the wrong type', () => {
    const fieldConfig = { name: 'id', widget: 'uuid', read_only: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects use_b32_encoding with the wrong type', () => {
    const fieldConfig = { name: 'id', widget: 'uuid', use_b32_encoding: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
