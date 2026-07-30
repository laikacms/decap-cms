import { fromJS, Map } from 'immutable';

import { getFirstInvalidFieldName } from '../fieldValidationErrors';

import type { EntryFields, FieldsErrors } from '../../types/redux';

function makeFields(names: string[]) {
  return fromJS(names.map(name => ({ name, widget: 'string' }))) as unknown as EntryFields;
}

function makeFieldsErrors(
  errorsByUniqueId: Record<
    string,
    { fieldName?: string; parentIds?: string[]; type?: string; message?: string }[]
  >,
) {
  return Map(errorsByUniqueId) as unknown as FieldsErrors;
}

describe('lib/fieldValidationErrors', () => {
  describe('getFirstInvalidFieldName', () => {
    it('returns undefined when fields is undefined', () => {
      const fieldsErrors = makeFieldsErrors({
        widget_1: [{ type: 'PRESENCE', fieldName: 'title' }],
      });

      expect(getFirstInvalidFieldName(fieldsErrors, undefined)).toBeUndefined();
    });

    it('excludes nested object/list subfield errors and only considers top-level errors', () => {
      const fields = makeFields(['title', 'body', 'seo']);
      const fieldsErrors = makeFieldsErrors({
        // top-level field with no parentIds
        widget_body: [{ type: 'PRESENCE', fieldName: 'body' }],
        // nested subfield error under a compound "seo" field - must be excluded
        widget_seo_description: [
          { type: 'PRESENCE', fieldName: 'description', parentIds: ['widget_seo'] },
        ],
      });

      // only "body" should be picked; the nested "description" error must not
      // surface as a top-level match, and "seo" itself has no direct error
      expect(getFirstInvalidFieldName(fieldsErrors, fields)).toBe('body');
    });

    it('returns the first field in declaration order whose name has an error, not just any matching field', () => {
      const fields = makeFields(['title', 'body', 'seo']);
      const fieldsErrors = makeFieldsErrors({
        // errors registered out of field-declaration order
        widget_seo: [{ type: 'PRESENCE', fieldName: 'seo' }],
        widget_body: [{ type: 'PRESENCE', fieldName: 'body' }],
      });

      expect(getFirstInvalidFieldName(fieldsErrors, fields)).toBe('body');
    });

    it('returns undefined when no top-level field has an error', () => {
      const fields = makeFields(['title', 'body']);
      const fieldsErrors = makeFieldsErrors({
        widget_other: [{ type: 'PRESENCE', fieldName: 'unrelated' }],
        widget_nested: [{ type: 'PRESENCE', fieldName: 'title', parentIds: ['widget_seo'] }],
      });

      expect(getFirstInvalidFieldName(fieldsErrors, fields)).toBeUndefined();
    });

    it('returns undefined when there are no errors at all', () => {
      const fields = makeFields(['title', 'body']);
      const fieldsErrors = makeFieldsErrors({});

      expect(getFirstInvalidFieldName(fieldsErrors, fields)).toBeUndefined();
    });

    it('ignores errors without a fieldName', () => {
      const fields = makeFields(['title', 'body']);
      const fieldsErrors = makeFieldsErrors({
        widget_title: [{ type: 'CUSTOM', message: 'something went wrong' }],
      });

      expect(getFirstInvalidFieldName(fieldsErrors, fields)).toBeUndefined();
    });

    it('treats an explicit empty parentIds array as top-level', () => {
      const fields = makeFields(['title']);
      const fieldsErrors = makeFieldsErrors({
        widget_title: [{ type: 'PRESENCE', fieldName: 'title', parentIds: [] }],
      });

      expect(getFirstInvalidFieldName(fieldsErrors, fields)).toBe('title');
    });
  });
});
