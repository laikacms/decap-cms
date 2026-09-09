import type { CmsEntry, CmsEntryField } from '@/lib/util/index';

/**
 * DCMS-1422 (partial): computes the value each top-level field configured
 * with `widget: 'autoincrement'` should get on a brand-new entry - the
 * current max value already used for that field across `existingEntries`,
 * plus 1, or the field's configured `start` (default `1`) when no existing
 * entry has a usable value yet.
 *
 * Pure and read-only: callers decide which entries make up the comparison
 * pool (mirrors `findUniqueFieldConflicts`) and are responsible for writing
 * the result into the new entry's draft data. Only top-level fields are
 * considered; fields nested inside `object`/`list` widgets are out of scope
 * for this slice.
 */
export function computeAutoincrementValues(
  fields: CmsEntryField[],
  existingEntries: CmsEntry[],
): Record<string, number> {
  const autoincrementFields = fields.filter(field => field.widget === 'autoincrement');
  if (autoincrementFields.length === 0) {
    return {};
  }

  const values: Record<string, number> = {};

  for (const field of autoincrementFields) {
    const configuredStart = field.start;
    const start = typeof configuredStart === 'number' && Number.isFinite(configuredStart)
      ? configuredStart
      : 1;

    let max: number | undefined;
    for (const entry of existingEntries) {
      const raw = (entry.data as Record<string, unknown> | undefined)?.[field.name];
      const num = typeof raw === 'number'
        ? raw
        : typeof raw === 'string' && raw !== ''
        ? Number(raw)
        : NaN;

      if (Number.isFinite(num) && (max === undefined || num > max)) {
        max = num;
      }
    }

    values[field.name] = max === undefined ? start : max + 1;
  }

  return values;
}

/** Cheap presence check so callers can skip building the entries pool entirely. */
export function hasAutoincrementFields(fields: CmsEntryField[]): boolean {
  return fields.some(field => field.widget === 'autoincrement');
}
