import Ajv from 'ajv';

import schema from '../schema';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile({ type: 'object', properties: schema.properties });

describe('object widget schema', () => {
  describe('collapsed', () => {
    it('accepts boolean values', () => {
      expect(validate({ collapsed: false })).toBe(true);
    });

    it('rejects non-boolean values', () => {
      expect(validate({ collapsed: 1 })).toBe(false);
    });
  });

  describe('summary', () => {
    it('accepts string values', () => {
      expect(validate({ collapsed: false, summary: '{{title}}' })).toBe(true);
    });

    it('rejects non-string values', () => {
      expect(validate({ summary: 123 })).toBe(false);
    });
  });
});
