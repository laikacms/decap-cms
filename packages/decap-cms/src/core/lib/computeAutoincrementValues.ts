import type { CmsEntry, CmsEntryField } from '@/lib/util/index';

const PLAIN_DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

export type AutoincrementValues = { [name: string]: number | AutoincrementValues };

function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && PLAIN_DECIMAL.test(raw.trim())) return Number(raw.trim());
  return NaN;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function subFields(field: CmsEntryField): CmsEntryField[] {
  return field.widget === 'object' && Array.isArray(field.fields) ? (field.fields as CmsEntryField[]) : [];
}

/**
 * DCMS-1422 / DCMS-2587: computes the value each field configured with
 * `widget: 'autoincrement'` should get on a brand-new entry - the current max
 * value already used for that field across `existingEntries`, plus 1, or the
 * field's configured `start` (default `1`) when no existing entry has a usable
 * value yet.
 *
 * Top-level fields and fields nested (at any depth) inside `object` widgets
 * are covered; the result mirrors the field tree, e.g. `{ meta: { ticketId: 4 } }`.
 * Fields inside `list` widgets are not: a list item has no stable identity to
 * count against, so there is no sound "max across the collection".
 *
 * Pure and read-only: callers decide which entries make up the comparison
 * pool (mirrors `findUniqueFieldConflicts`) and are responsible for writing
 * the result into the new entry's draft data.
 */
export function computeAutoincrementValues(
  fields: CmsEntryField[],
  existingEntries: CmsEntry[],
): AutoincrementValues {
  return computeForPool(
    fields,
    existingEntries.map(entry => entry.data as unknown),
  );
}

function computeForPool(fields: CmsEntryField[], pool: unknown[]): AutoincrementValues {
  const values: AutoincrementValues = {};

  for (const field of fields) {
    if (field.widget === 'autoincrement') {
      const configuredStart = field.start;
      const start = typeof configuredStart === 'number' && Number.isFinite(configuredStart)
        ? configuredStart
        : 1;

      let max: number | undefined;
      for (const data of pool) {
        const num = toNumber(isRecord(data) ? data[field.name] : undefined);
        if (Number.isFinite(num) && (max === undefined || num > max)) {
          max = num;
        }
      }

      values[field.name] = max === undefined ? start : max + 1;
      continue;
    }

    const nested = subFields(field);
    if (nested.length > 0 && hasAutoincrementFields(nested)) {
      const nestedPool = pool.map(data => (isRecord(data) ? data[field.name] : undefined));
      values[field.name] = computeForPool(nested, nestedPool);
    }
  }

  return values;
}

/** Cheap presence check so callers can skip building the entries pool entirely. */
export function hasAutoincrementFields(fields: CmsEntryField[]): boolean {
  return fields.some(field => field.widget === 'autoincrement' || hasAutoincrementFields(subFields(field)));
}
