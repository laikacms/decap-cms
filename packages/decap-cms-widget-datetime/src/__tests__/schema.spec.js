import Ajv from 'ajv';

import schema from '../schema';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile({ type: 'object', properties: schema.properties });

describe('datetime widget schema', () => {
  describe('date_format', () => {
    it('accepts string values', () => {
      expect(validate({ date_format: 'YYYY-MM-DD' })).toBe(true);
    });

    it('accepts true', () => {
      expect(validate({ date_format: true })).toBe(true);
    });

    it('accepts false', () => {
      expect(validate({ date_format: false })).toBe(true);
    });

    it('rejects number values', () => {
      expect(validate({ date_format: 42 })).toBe(false);
    });
  });

  describe('time_format', () => {
    it('accepts string values', () => {
      expect(validate({ time_format: 'HH:mm' })).toBe(true);
    });

    it('accepts false', () => {
      expect(validate({ time_format: false })).toBe(true);
    });

    it('rejects number values', () => {
      expect(validate({ time_format: 42 })).toBe(false);
    });
  });

  describe('picker_utc', () => {
    it('accepts boolean values', () => {
      expect(validate({ picker_utc: true })).toBe(true);
    });

    it('rejects non-boolean values', () => {
      expect(validate({ picker_utc: 'yes' })).toBe(false);
    });
  });

  describe('deprecated camelCase aliases', () => {
    it('dateFormat accepts string values', () => {
      expect(validate({ dateFormat: 'YYYY-MM-DD' })).toBe(true);
    });

    it('dateFormat accepts boolean values', () => {
      expect(validate({ dateFormat: false })).toBe(true);
    });

    it('dateFormat rejects number values', () => {
      expect(validate({ dateFormat: 42 })).toBe(false);
    });

    it('timeFormat accepts string values', () => {
      expect(validate({ timeFormat: 'HH:mm' })).toBe(true);
    });

    it('timeFormat accepts boolean values', () => {
      expect(validate({ timeFormat: false })).toBe(true);
    });

    it('timeFormat rejects number values', () => {
      expect(validate({ timeFormat: 42 })).toBe(false);
    });

    it('pickerUtc accepts boolean values', () => {
      expect(validate({ pickerUtc: true })).toBe(true);
    });

    it('pickerUtc rejects non-boolean values', () => {
      expect(validate({ pickerUtc: 'yes' })).toBe(false);
    });
  });
});
