import AJV from 'ajv';

import schema from '../schema';

const ajv = new AJV({ allErrors: true, strict: false });

const widgetSchema = {
  type: 'object',
  properties: schema.properties,
  additionalProperties: true,
};

describe('image widget schema', () => {
  describe('choose_url', () => {
    it('is defined as a boolean top-level property in the schema', () => {
      expect(schema.properties.choose_url).toEqual({ type: 'boolean' });
    });

    it('accepts true as a valid value', () => {
      const valid = ajv.validate(widgetSchema, { choose_url: true });
      expect(valid).toBe(true);
    });

    it('accepts false as a valid value', () => {
      const valid = ajv.validate(widgetSchema, { choose_url: false });
      expect(valid).toBe(true);
    });

    it('rejects a string value (wrong type)', () => {
      const valid = ajv.validate(widgetSchema, { choose_url: 'yes' });
      expect(valid).toBe(false);
      expect(ajv.errors.some(e => e.instancePath === '/choose_url')).toBe(true);
    });
  });

  describe('media_library.allow_multiple', () => {
    it('is defined as a boolean under media_library in the schema', () => {
      expect(schema.properties.media_library).toBeDefined();
      expect(schema.properties.media_library.type).toBe('object');
      expect(schema.properties.media_library.properties.allow_multiple).toEqual({
        type: 'boolean',
      });
    });
  });
});
