import Ajv from 'ajv';

import schema from '../schema';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile({ type: 'object', ...schema });

describe('select widget schema', () => {
  describe('options', () => {
    it('is required', () => {
      expect(validate({})).toBe(false);
      const errors = validate.errors || [];
      expect(errors.some(e => e.params?.missingProperty === 'options')).toBe(true);
    });

    it('accepts string option items', () => {
      expect(validate({ options: ['foo', 'bar'] })).toBe(true);
    });

    it('accepts number option items', () => {
      expect(validate({ options: [1, 2, 3] })).toBe(true);
    });

    it('accepts { label, value } object items', () => {
      expect(validate({ options: [{ label: 'Foo', value: 'foo' }] })).toBe(true);
    });

    it('accepts { label, value } objects with numeric value', () => {
      expect(validate({ options: [{ label: 'One', value: 1 }] })).toBe(true);
    });

    it('rejects object items missing label', () => {
      expect(validate({ options: [{ value: 'foo' }] })).toBe(false);
    });

    it('rejects object items missing value', () => {
      expect(validate({ options: [{ label: 'Foo' }] })).toBe(false);
    });
  });

  describe('multiple: true — min/max allowed', () => {
    it('accepts min with multiple: true', () => {
      expect(validate({ options: ['a'], multiple: true, min: 1 })).toBe(true);
    });

    it('accepts max with multiple: true', () => {
      expect(validate({ options: ['a'], multiple: true, max: 5 })).toBe(true);
    });

    it('accepts both min and max with multiple: true', () => {
      expect(validate({ options: ['a', 'b', 'c'], multiple: true, min: 1, max: 3 })).toBe(true);
    });
  });

  describe('multiple not true — min/max ignored, not rejected (DCMS-310)', () => {
    // min/max are ignored at runtime by SelectControl#isValid when the
    // field isn't multiple, so the schema no longer rejects their presence —
    // it simply doesn't enforce them.
    it('accepts min without multiple: true', () => {
      expect(validate({ options: ['a'], min: 1 })).toBe(true);
    });

    it('accepts max without multiple: true', () => {
      expect(validate({ options: ['a'], max: 5 })).toBe(true);
    });

    it('accepts min/max when multiple is false', () => {
      expect(validate({ options: ['a'], multiple: false, min: 1 })).toBe(true);
    });
  });
});
