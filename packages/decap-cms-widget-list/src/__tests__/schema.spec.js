import Ajv from 'ajv';

import schema from '../schema';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile({ type: 'object', properties: schema.properties });

describe('list widget schema', () => {
  describe('min', () => {
    it('accepts integer values', () => {
      expect(validate({ min: 2 })).toBe(true);
    });

    it('rejects float values', () => {
      expect(validate({ min: 1.5 })).toBe(false);
    });
  });

  describe('max', () => {
    it('accepts integer values', () => {
      expect(validate({ max: 5 })).toBe(true);
    });

    it('rejects float values', () => {
      expect(validate({ max: 2.5 })).toBe(false);
    });
  });
});
