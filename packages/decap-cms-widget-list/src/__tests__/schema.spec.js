import Ajv from 'ajv';

import schema from '../schema';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile({ type: 'object', properties: schema.properties });
// Full schema, including the `not` constraint that enforces mutual
// exclusivity between `field`, `fields`, and `types`.
const validateFull = ajv.compile({ type: 'object', ...schema });

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

  describe('add_to_top', () => {
    it('accepts boolean values', () => {
      expect(validate({ add_to_top: true })).toBe(true);
    });

    it('rejects non-boolean values', () => {
      expect(validate({ add_to_top: 1 })).toBe(false);
    });
  });

  describe('typeKey', () => {
    it('accepts string values', () => {
      expect(validate({ typeKey: 'kind' })).toBe(true);
    });

    it('rejects non-string values', () => {
      expect(validate({ typeKey: 123 })).toBe(false);
    });
  });

  describe('field (single-field list)', () => {
    it('accepts a valid field config', () => {
      expect(validateFull({ field: { label: 'Tag', name: 'tag', widget: 'string' } })).toBe(true);
    });

    it('rejects a non-object value', () => {
      expect(validate({ field: 'not-an-object' })).toBe(false);
    });
  });

  describe('fields (multi-field list)', () => {
    it('accepts a valid fields config', () => {
      expect(
        validateFull({
          fields: [
            { label: 'Title', name: 'title', widget: 'string' },
            { label: 'URL', name: 'url', widget: 'string' },
          ],
        }),
      ).toBe(true);
    });

    it('rejects a non-array value', () => {
      expect(validate({ fields: { label: 'Title', name: 'title', widget: 'string' } })).toBe(false);
    });

    it('rejects an empty array', () => {
      expect(validate({ fields: [] })).toBe(false);
    });
  });

  describe('types (variable/typed list)', () => {
    it('accepts a valid types config', () => {
      expect(
        validateFull({
          types: [
            {
              label: 'Heading',
              name: 'heading',
              widget: 'object',
              fields: [{ label: 'Text', name: 'text', widget: 'string' }],
            },
            {
              label: 'Paragraph',
              name: 'paragraph',
              widget: 'object',
              fields: [{ label: 'Body', name: 'body', widget: 'markdown' }],
            },
          ],
        }),
      ).toBe(true);
    });

    it('rejects type entries without a name', () => {
      expect(
        validate({
          types: [{ label: 'Heading', widget: 'object' }],
        }),
      ).toBe(false);
    });
  });

  describe('field/fields/types mutual exclusivity', () => {
    it('accepts a plain list with none of field/fields/types set', () => {
      expect(validateFull({ allow_add: true })).toBe(true);
    });

    it('accepts exactly one of field/fields/types', () => {
      expect(validateFull({ field: { name: 'tag', widget: 'string' } })).toBe(true);
      expect(validateFull({ fields: [{ name: 'title', widget: 'string' }] })).toBe(true);
      expect(validateFull({ types: [{ name: 'heading', widget: 'object' }] })).toBe(true);
    });

    it('rejects a mix of field and fields', () => {
      expect(
        validateFull({
          field: { name: 'tag', widget: 'string' },
          fields: [{ name: 'title', widget: 'string' }],
        }),
      ).toBe(false);
    });

    it('rejects a mix of field and types', () => {
      expect(
        validateFull({
          field: { name: 'tag', widget: 'string' },
          types: [{ name: 'heading', widget: 'object' }],
        }),
      ).toBe(false);
    });

    it('rejects a mix of fields and types', () => {
      expect(
        validateFull({
          fields: [{ name: 'title', widget: 'string' }],
          types: [{ name: 'heading', widget: 'object' }],
        }),
      ).toBe(false);
    });
  });
});
