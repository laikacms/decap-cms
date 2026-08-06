import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import numberSchema from '@/widgets/number/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('number widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { number: numberSchema },
  };

  it('accepts a valid number field config', () => {
    const fieldConfig = {
      name: 'quantity',
      widget: 'number',
      step: 1,
      value_type: 'int',
      min: 0,
      max: 100,
      slider: true,
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects step with the wrong type', () => {
    const fieldConfig = { name: 'quantity', widget: 'number', step: 'one' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects value_type with the wrong type', () => {
    const fieldConfig = { name: 'quantity', widget: 'number', value_type: 42 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects min with the wrong type', () => {
    const fieldConfig = { name: 'quantity', widget: 'number', min: 'zero' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects max with the wrong type', () => {
    const fieldConfig = { name: 'quantity', widget: 'number', max: 'hundred' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects slider with the wrong type', () => {
    const fieldConfig = { name: 'quantity', widget: 'number', slider: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
