/**
 * WCAG 2.1 3.3.1 / 3.3.3: leaf widget controls carried no programmatic error
 * state on failed save (DCMS-1743, porting the DCMS-1083/DCMS-1086 fix from
 * v4.beta). `EditorControl` threads `hasErrors`/`errorListId` down through
 * `Widget` into each control; this helper turns those two props plus the
 * field's `required` flag into the standard set of aria attributes every
 * widget's leaf input should carry.
 *
 * `aria-describedby` is included alongside `aria-errormessage` as a fallback
 * for browsers/assistive tech that don't yet support `aria-errormessage`.
 */

interface FieldLike {
  get: (key: string, defaultValue?: unknown) => unknown;
}

export interface FieldAriaProps {
  'aria-required': boolean;
  'aria-invalid': true | undefined;
  'aria-errormessage': string | undefined;
  'aria-describedby': string | undefined;
}

export function getFieldAriaProps(
  field: FieldLike,
  hasErrors: boolean | undefined,
  errorListId: string | undefined,
): FieldAriaProps {
  return {
    'aria-required': field.get('required') !== false,
    'aria-invalid': hasErrors ? true : undefined,
    'aria-errormessage': hasErrors ? errorListId : undefined,
    'aria-describedby': hasErrors ? errorListId : undefined,
  };
}
