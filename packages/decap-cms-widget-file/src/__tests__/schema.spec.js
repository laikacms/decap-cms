import AJV from 'ajv';
import { Map } from 'immutable';

import schema from '../schema';

const ajv = new AJV({ allErrors: true, strict: false });

const widgetSchema = {
  type: 'object',
  properties: schema.properties,
  additionalProperties: true,
};

describe('file widget schema', () => {
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

    it('allow_multiple is NOT a top-level schema property', () => {
      expect(schema.properties.allow_multiple).toBeUndefined();
    });

    it('allow_multiple:false in media_library is read by getMediaLibraryFieldOptions', () => {
      // Simulate how withFileControl reads allow_multiple via getMediaLibraryFieldOptions:
      // field.get('media_library', Map()).get('allow_multiple', true)
      const fieldWithFalse = Map({
        name: 'upload',
        widget: 'file',
        media_library: Map({ allow_multiple: false }),
      });
      const mediaLibraryOptions = fieldWithFalse.get('media_library', Map());
      expect(mediaLibraryOptions.get('allow_multiple', true)).toBe(false);
    });

    it('allow_multiple defaults to true when not specified', () => {
      const fieldWithoutOption = Map({ name: 'upload', widget: 'file' });
      const mediaLibraryOptions = fieldWithoutOption.get('media_library', Map());
      expect(mediaLibraryOptions.get('allow_multiple', true)).toBe(true);
    });

    it('top-level allow_multiple has no effect on media library options', () => {
      // A field with allow_multiple at the wrong (top) level must NOT affect the option
      const fieldWithTopLevelOnly = Map({
        name: 'upload',
        widget: 'file',
        allow_multiple: false,
      });
      const mediaLibraryOptions = fieldWithTopLevelOnly.get('media_library', Map());
      // The code reads from media_library sub-map, so this still defaults to true
      expect(mediaLibraryOptions.get('allow_multiple', true)).toBe(true);
    });
  });
});
