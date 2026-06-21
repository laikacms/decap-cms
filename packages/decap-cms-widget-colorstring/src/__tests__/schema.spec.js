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
});
