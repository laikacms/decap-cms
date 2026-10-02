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

  describe('duplicate option values', () => {
    const errorsFor = (options: unknown[]) =>
      validateJSONSchema(fieldSchema, { name: 'category', widget: 'select', options });

    it('rejects duplicate string options', () => {
      expect(errorsFor(['a', 'b', 'a'])).not.toEqual([]);
    });

    it('rejects duplicate object values', () => {
      expect(
        errorsFor([
          { label: 'A', value: 'a' },
          { label: 'Alt', value: 'a' },
        ]),
      ).not.toEqual([]);
    });

    it('rejects a string option duplicated by an object value', () => {
      expect(errorsFor(['a', { label: 'Alt', value: 'a' }])).not.toEqual([]);
    });

    it('accepts distinct values even when labels repeat', () => {
      expect(
        errorsFor([
          { label: 'Same', value: 'a' },
          { label: 'Same', value: 'b' },
          'c',
          1,
        ]),
      ).toEqual([]);
    });
  });

  describe('min/max bounds', () => {
    const withMinMax = (min?: number, max?: number) => ({
      name: 'category',
      widget: 'select',
      options: ['a', 'b'],
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
    });

    it('rejects a negative min', () => {
      expect(validateJSONSchema(fieldSchema, withMinMax(-1))).not.toEqual([]);
    });

    it('rejects a negative max', () => {
      expect(validateJSONSchema(fieldSchema, withMinMax(undefined, -1))).not.toEqual([]);
    });

    it('rejects min greater than max', () => {
      expect(validateJSONSchema(fieldSchema, withMinMax(3, 2))).not.toEqual([]);
    });

    it('accepts min 0 and max 0', () => {
      expect(validateJSONSchema(fieldSchema, withMinMax(0, 0))).toEqual([]);
    });

    it('accepts min equal to max', () => {
      expect(validateJSONSchema(fieldSchema, withMinMax(2, 2))).toEqual([]);
    });
  });

  describe('min vs options length (multiple: true)', () => {
    const multi = (min: number, max: number | undefined, options: string[], multiple = true) => ({
      name: 'category',
      widget: 'select',
      multiple,
      options,
      min,
      ...(max === undefined ? {} : { max }),
    });

    it('rejects min greater than max', () => {
      expect(validateJSONSchema(fieldSchema, multi(3, 2, ['a', 'b', 'c']))).not.toEqual([]);
    });

    it('rejects min greater than options length', () => {
      expect(validateJSONSchema(fieldSchema, multi(5, undefined, ['a', 'b', 'c']))).not.toEqual([]);
    });

    it('accepts min 0 and max 0', () => {
      expect(validateJSONSchema(fieldSchema, multi(0, 0, ['a', 'b', 'c']))).toEqual([]);
    });

    it('accepts min equal to max', () => {
      expect(validateJSONSchema(fieldSchema, multi(2, 2, ['a', 'b', 'c']))).toEqual([]);
    });

    it('accepts min equal to options length', () => {
      expect(validateJSONSchema(fieldSchema, multi(3, undefined, ['a', 'b', 'c']))).toEqual([]);
    });

    it('does not apply the options-length check without multiple: true', () => {
      expect(validateJSONSchema(fieldSchema, multi(5, undefined, ['a'], false))).toEqual([]);
    });
  });
});
