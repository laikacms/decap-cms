import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import colorSchema from '@/widgets/colorstring/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('color widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { color: colorSchema },
  };

  it('accepts a valid color field config', () => {
    const fieldConfig = {
      name: 'color',
      widget: 'color',
      allowInput: true,
      enableAlpha: true,
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects allowInput with the wrong type', () => {
    const fieldConfig = { name: 'color', widget: 'color', allowInput: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects enableAlpha with the wrong type', () => {
    const fieldConfig = { name: 'color', widget: 'color', enableAlpha: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
