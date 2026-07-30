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
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects summary with the wrong type', () => {
    const fieldConfig = { name: 'address', widget: 'object', summary: 123 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
