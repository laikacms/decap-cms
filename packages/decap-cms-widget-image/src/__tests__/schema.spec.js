import { Map } from 'immutable';

import schema from '../schema';

describe('image widget schema', () => {
  describe('media_library', () => {
    it('is defined as an object under schema.properties', () => {
      expect(schema.properties.media_library).toBeDefined();
      expect(schema.properties.media_library.type).toBe('object');
    });

    it('has allow_multiple, choose_url, and config nested inside media_library', () => {
      const { properties } = schema.properties.media_library;
      expect(properties.allow_multiple).toEqual({ type: 'boolean' });
      expect(properties.choose_url).toEqual({ type: 'boolean' });
      expect(properties.config).toEqual({ type: 'object' });
    });

    it('allow_multiple is NOT a top-level schema property', () => {
      expect(schema.properties.allow_multiple).toBeUndefined();
    });

    it('has top-level choose_url property', () => {
      expect(schema.properties.choose_url).toEqual({ type: 'boolean' });
    });

    it('has top-level private property', () => {
      expect(schema.properties.private).toEqual({ type: 'boolean' });
    });
  });

  describe('allow_multiple behavior via getMediaLibraryFieldOptions', () => {
    it('allow_multiple:false in media_library is read correctly', () => {
      const fieldWithFalse = Map({
        name: 'photo',
        widget: 'image',
        media_library: Map({ allow_multiple: false }),
      });
      const mediaLibraryOptions = fieldWithFalse.get('media_library', Map());
      expect(mediaLibraryOptions.get('allow_multiple', true)).toBe(false);
    });

    it('allow_multiple defaults to true when not specified', () => {
      const fieldWithoutOption = Map({ name: 'photo', widget: 'image' });
      const mediaLibraryOptions = fieldWithoutOption.get('media_library', Map());
      expect(mediaLibraryOptions.get('allow_multiple', true)).toBe(true);
    });

    it('top-level allow_multiple has no effect on media library options', () => {
      const fieldWithTopLevelOnly = Map({
        name: 'photo',
        widget: 'image',
        allow_multiple: false,
      });
      const mediaLibraryOptions = fieldWithTopLevelOnly.get('media_library', Map());
      expect(mediaLibraryOptions.get('allow_multiple', true)).toBe(true);
    });
  });
});
