import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import selectSchema from '@/widgets/select/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('select widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { select: selectSchema },
  };

  it('accepts a valid select field config with string options', () => {
    const fieldConfig = {
      name: 'category',
      widget: 'select',
      multiple: false,
      min: 1,
      max: 3,
      options: ['a', 'b', 'c'],
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts number options', () => {
    const fieldConfig = { name: 'category', widget: 'select', options: [1, 2, 3] };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts label/value object options', () => {
    const fieldConfig = {
      name: 'category',
      widget: 'select',
      options: [
        { label: 'One', value: 1 },
        { label: 'Two', value: 'two' },
      ],
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects a field config missing options', () => {
    const fieldConfig = { name: 'category', widget: 'select' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects an object option missing the required value', () => {
    const fieldConfig = { name: 'category', widget: 'select', options: [{ label: 'One' }] };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects an object option missing the required label', () => {
    const fieldConfig = { name: 'category', widget: 'select', options: [{ value: 1 }] };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects an object option with a wrongly typed value', () => {
    const fieldConfig = {
      name: 'category',
      widget: 'select',
      options: [{ label: 'One', value: true }],
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects an option that is not a string, number, or object', () => {
    const fieldConfig = { name: 'category', widget: 'select', options: [true] };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects multiple with the wrong type', () => {
    const fieldConfig = { name: 'category', widget: 'select', options: ['a'], multiple: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects min/max with the wrong type', () => {
    const fieldConfig = { name: 'category', widget: 'select', options: ['a'], min: 'one' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
