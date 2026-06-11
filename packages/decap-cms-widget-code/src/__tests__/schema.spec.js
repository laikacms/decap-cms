import schema from '../schema';

describe('Code widget schema', () => {
  describe('default_language', () => {
    it('should restrict default_language to string type', () => {
      expect(schema.properties.default_language).toEqual({ type: 'string' });
    });

    it('should accept a string value like "javascript"', () => {
      expect(schema.properties.default_language.type).toBe('string');
      expect(typeof 'javascript').toBe(schema.properties.default_language.type);
    });

    it('should reject a numeric value for default_language', () => {
      expect(schema.properties.default_language.type).toBe('string');
      expect(typeof 123).not.toBe(schema.properties.default_language.type);
    });
  });

  describe('allow_language_selection', () => {
    it('should restrict allow_language_selection to boolean type', () => {
      expect(schema.properties.allow_language_selection).toEqual({ type: 'boolean' });
    });

    it('should accept a boolean value like false', () => {
      expect(schema.properties.allow_language_selection.type).toBe('boolean');
      expect(typeof false).toBe(schema.properties.allow_language_selection.type);
    });

    it('should reject a string value like "yes" for allow_language_selection', () => {
      expect(schema.properties.allow_language_selection.type).toBe('boolean');
      expect(typeof 'yes').not.toBe(schema.properties.allow_language_selection.type);
    });
  });

  describe('output_code_only', () => {
    it('should restrict output_code_only to boolean type', () => {
      expect(schema.properties.output_code_only).toEqual({ type: 'boolean' });
    });

    it('should accept a boolean value like true', () => {
      expect(schema.properties.output_code_only.type).toBe('boolean');
      expect(typeof true).toBe(schema.properties.output_code_only.type);
    });

    it('should reject a numeric value like 0 for output_code_only', () => {
      expect(schema.properties.output_code_only.type).toBe('boolean');
      expect(typeof 0).not.toBe(schema.properties.output_code_only.type);
    });
  });

  describe('keys', () => {
    it('should restrict keys to object type', () => {
      expect(schema.properties.keys.type).toBe('object');
    });

    it('should define code as a string property inside keys', () => {
      expect(schema.properties.keys.properties.code).toEqual({ type: 'string' });
    });

    it('should define lang as a string property inside keys', () => {
      expect(schema.properties.keys.properties.lang).toEqual({ type: 'string' });
    });

    it('should accept string values for keys.code and keys.lang', () => {
      const { code, lang } = schema.properties.keys.properties;
      expect(typeof 'code').toBe(code.type);
      expect(typeof 'lang').toBe(lang.type);
    });

    it('should reject a numeric value for keys.code', () => {
      const { code } = schema.properties.keys.properties;
      expect(typeof 1).not.toBe(code.type);
    });
  });
});
