import Ajv from 'ajv';

import schema from '../schema';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile({ type: 'object', properties: schema.properties });

describe('colorstring widget schema', () => {
  describe('allow_input', () => {
    it('accepts true', () => {
      expect(validate({ allow_input: true })).toBe(true);
    });

    it('accepts false', () => {
      expect(validate({ allow_input: false })).toBe(true);
    });

    it('rejects non-boolean values', () => {
      expect(validate({ allow_input: 1 })).toBe(false);
    });
  });

  describe('enable_alpha', () => {
    it('accepts true', () => {
      expect(validate({ enable_alpha: true })).toBe(true);
    });

    it('accepts false', () => {
      expect(validate({ enable_alpha: false })).toBe(true);
    });

    it('rejects non-boolean values', () => {
      expect(validate({ enable_alpha: 'yes' })).toBe(false);
    });
  });

  describe('camelCase alias field types (DCMS-1683)', () => {
    it('accepts allowInput: true', () => {
      expect(validate({ allowInput: true })).toBe(true);
    });

    it('accepts allowInput: false', () => {
      expect(validate({ allowInput: false })).toBe(true);
    });

    it('rejects allowInput with the wrong type', () => {
      expect(validate({ allowInput: 'yes' })).toBe(false);
    });

    it('accepts enableAlpha: true', () => {
      expect(validate({ enableAlpha: true })).toBe(true);
    });

    it('accepts enableAlpha: false', () => {
      expect(validate({ enableAlpha: false })).toBe(true);
    });

    it('rejects enableAlpha with the wrong type', () => {
      expect(validate({ enableAlpha: 'yes' })).toBe(false);
    });
  });
});
