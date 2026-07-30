import type { EntryFields, FieldsErrors } from '../types/redux';

/**
 * DCMS-1684: after a failed save, the editor should scroll/focus the first
 * (in field declaration order) top-level field that is currently invalid -
 * regardless of widget type. `fieldsErrors` is keyed by each field's
 * internally-generated `uniqueFieldId`, which isn't derivable from outside
 * the component tree, so `Widget.js` also stamps every error object with
 * the plain `fieldName` it belongs to; this walks the ordered top-level
 * field list and finds the first one with a `fieldName`-tagged error.
 *
 * Only top-level fields are considered (`parentIds` empty) - nested
 * object/list subfield errors are still visible once the user reaches the
 * containing compound field, whose own focus/scroll implementation already
 * knows how to drill into its children.
 */
export function getFirstInvalidFieldName(
  fieldsErrors: FieldsErrors,
  fields: EntryFields | undefined,
): string | undefined {
  if (!fields) {
    return undefined;
  }

  const fieldNamesWithErrors = new Set<string>();

  fieldsErrors
    .valueSeq()
    .toArray()
    .forEach(errors => {
      errors?.forEach(error => {
        if (error?.fieldName && (!error.parentIds || error.parentIds.length === 0)) {
          fieldNamesWithErrors.add(error.fieldName);
        }
      });
    });

  const firstField = fields.find(field => fieldNamesWithErrors.has(field.get('name')));
  return firstField?.get('name');
}

export class EntryValidationError extends Error {
  fieldName?: string;

  constructor(message: string, fieldName?: string) {
    super(message);
    this.name = 'EntryValidationError';
    this.fieldName = fieldName;
  }
}
