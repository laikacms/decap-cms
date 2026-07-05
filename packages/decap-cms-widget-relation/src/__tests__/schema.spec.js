import Ajv from 'ajv';

import schema from '../schema';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile({ type: 'object', ...schema });

function omit(obj, ...keys) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));
}

const baseSnake = { collection: 'posts', value_field: 'slug', search_fields: ['title'] };
const baseCamel = { collection: 'posts', valueField: 'slug', searchFields: ['title'] };

describe('relation widget schema', () => {
  describe('required fields — snake_case variant', () => {
    it('passes with collection, value_field, search_fields', () => {
      expect(validate({ ...baseSnake })).toBe(true);
    });

    it('fails when value_field is missing', () => {
      expect(validate(omit(baseSnake, 'value_field'))).toBe(false);
    });

    it('fails when search_fields is missing', () => {
      expect(validate(omit(baseSnake, 'search_fields'))).toBe(false);
    });

    it('fails when collection is missing', () => {
      expect(validate(omit(baseSnake, 'collection'))).toBe(false);
    });
  });

  describe('required fields — camelCase alias variant', () => {
    it('passes with collection, valueField, searchFields', () => {
      expect(validate({ ...baseCamel })).toBe(true);
    });

    it('fails when valueField is missing', () => {
      expect(validate(omit(baseCamel, 'valueField'))).toBe(false);
    });

    it('fails when searchFields is missing', () => {
      expect(validate(omit(baseCamel, 'searchFields'))).toBe(false);
    });
  });

  describe('required fields — neither variant', () => {
    it('fails when neither snake_case nor camelCase fields are provided', () => {
      expect(validate({ collection: 'posts' })).toBe(false);
    });

    it('fails when completely empty', () => {
      expect(validate({})).toBe(false);
    });
  });

  describe('min/max with multiple: true', () => {
    it('passes with min and multiple: true', () => {
      expect(validate({ ...baseSnake, multiple: true, min: 1 })).toBe(true);
    });

    it('passes with max and multiple: true', () => {
      expect(validate({ ...baseSnake, multiple: true, max: 5 })).toBe(true);
    });

    it('passes with both min and max and multiple: true', () => {
      expect(validate({ ...baseSnake, multiple: true, min: 1, max: 5 })).toBe(true);
    });
  });

  describe('min/max without multiple: true (DCMS-310)', () => {
    // min/max are ignored at runtime by RelationControl#isValid when the
    // field isn't multiple, so the schema no longer rejects their presence —
    // it simply doesn't enforce them.
    it('passes with min when multiple is absent', () => {
      expect(validate({ ...baseSnake, min: 1 })).toBe(true);
    });

    it('passes with max when multiple is absent', () => {
      expect(validate({ ...baseSnake, max: 5 })).toBe(true);
    });

    it('passes with min when multiple: false', () => {
      expect(validate({ ...baseSnake, multiple: false, min: 1 })).toBe(true);
    });

    it('passes with max when multiple: false', () => {
      expect(validate({ ...baseSnake, multiple: false, max: 5 })).toBe(true);
    });
  });

  describe('optional fields', () => {
    it('accepts file field', () => {
      expect(validate({ ...baseSnake, file: 'data.json' })).toBe(true);
    });

    it('accepts multiple: true', () => {
      expect(validate({ ...baseSnake, multiple: true })).toBe(true);
    });

    it('accepts multiple: false', () => {
      expect(validate({ ...baseSnake, multiple: false })).toBe(true);
    });

    it('accepts display_fields', () => {
      expect(validate({ ...baseSnake, display_fields: ['title', 'date'] })).toBe(true);
    });

    it('accepts options_length integer', () => {
      expect(validate({ ...baseSnake, options_length: 20 })).toBe(true);
    });

    it('rejects options_length float', () => {
      expect(validate({ ...baseSnake, options_length: 2.5 })).toBe(false);
    });

    it('accepts optionsLength integer (DCMS-226)', () => {
      expect(validate({ ...baseSnake, optionsLength: 20 })).toBe(true);
    });

    it('rejects optionsLength float (DCMS-226)', () => {
      expect(validate({ ...baseSnake, optionsLength: 2.5 })).toBe(false);
    });
  });

  describe('filters field', () => {
    it('passes with valid filters array', () => {
      expect(
        validate({
          ...baseSnake,
          filters: [{ field: 'status', values: ['published'] }],
        }),
      ).toBe(true);
    });

    it('fails when filter is missing field', () => {
      expect(
        validate({
          ...baseSnake,
          filters: [{ values: ['published'] }],
        }),
      ).toBe(false);
    });

    it('fails when filter is missing values', () => {
      expect(
        validate({
          ...baseSnake,
          filters: [{ field: 'status' }],
        }),
      ).toBe(false);
    });

    it('passes with float filter values (DCMS-227)', () => {
      expect(
        validate({
          ...baseSnake,
          filters: [{ field: 'rating', values: [1.5, 2.7] }],
        }),
      ).toBe(true);
    });
  });
});
