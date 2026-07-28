import AJV from 'ajv';
import { Map } from 'immutable';

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

  describe('crop_before_upload', () => {
    it('is defined as a boolean top-level property in the schema', () => {
      expect(schema.properties.crop_before_upload).toEqual({ type: 'boolean' });
    });

    it('accepts true as a valid value', () => {
      const valid = ajv.validate(widgetSchema, { crop_before_upload: true });
      expect(valid).toBe(true);
    });

    it('accepts false as a valid value', () => {
      const valid = ajv.validate(widgetSchema, { crop_before_upload: false });
      expect(valid).toBe(true);
    });

    it('rejects a string value (wrong type)', () => {
      const valid = ajv.validate(widgetSchema, { crop_before_upload: 'yes' });
      expect(valid).toBe(false);
      expect(ajv.errors.some(e => e.instancePath === '/crop_before_upload')).toBe(true);
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

  describe('media_library.config', () => {
    it('is defined as an object under media_library in the schema', () => {
      expect(schema.properties.media_library.properties.config).toEqual({
        type: 'object',
      });
    });

    it('config object in media_library is readable via getMediaLibraryFieldOptions', () => {
      const fieldWithConfig = Map({
        name: 'photo',
        widget: 'image',
        media_library: Map({ config: Map({ publicKey: 'xyz789' }) }),
      });
      const mediaLibraryOptions = fieldWithConfig.get('media_library', Map());
      expect(mediaLibraryOptions.get('config')).toBeDefined();
      expect(mediaLibraryOptions.get('config').get('publicKey')).toBe('xyz789');
    });

    it('config is undefined when not specified', () => {
      const fieldWithoutConfig = Map({ name: 'photo', widget: 'image' });
      const mediaLibraryOptions = fieldWithoutConfig.get('media_library', Map());
      expect(mediaLibraryOptions.get('config')).toBeUndefined();
    });
  });
});
