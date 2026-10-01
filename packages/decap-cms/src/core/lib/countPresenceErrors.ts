import ValidationErrorTypes from '@/core/constants/validationErrorTypes';

interface FieldValidationError {
  type?: string;
  hidden?: boolean;
}

/**
 * Number of required-field errors to report in the validation toast.
 *
 * Fields inside a collapsed object or list item are mounted (so they validate)
 * but their inline "is required" label is not visible, so counting them
 * inflates the toast beyond what the editor can act on (DCMS-2504). Those
 * errors are only counted when nothing visible is missing, so the toast never
 * claims zero missing fields while the save is still blocked.
 */
export function countPresenceErrors(fieldsErrors: Record<string, FieldValidationError[]>): number {
  let visible = 0;
  let total = 0;
  for (const errors of Object.values(fieldsErrors)) {
    const presenceErrors = errors.filter(error => error.type === ValidationErrorTypes.PRESENCE);
    if (presenceErrors.length === 0) continue;
    total += 1;
    if (presenceErrors.some(error => !error.hidden)) visible += 1;
  }
  return visible > 0 ? visible : total;
}
