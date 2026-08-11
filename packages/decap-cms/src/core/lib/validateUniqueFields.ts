import { isEqual } from 'lodash-es';

import { selectFields } from '@/core/reducers/collections';

import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@/lib/util/index';

export type UniqueFieldConflict = {
  field: CmsEntryField,
  conflictingSlug: string,
};

/**
 * DCMS-1422 (partial): checks every top-level field configured with
 * `unique: true` on `collection` against the value the entry being saved
 * carries, and reports a conflict for every OTHER entry in `otherEntries`
 * that already holds the same value.
 *
 * The entry being saved is identified by `slug` and excluded from its own
 * comparison set - saving an unmodified (or otherwise-modified) entry never
 * conflicts with itself. `otherEntries` are compared as-is, so callers
 * decide the pool (e.g. entries already loaded for the collection).
 *
 * Only top-level fields are checked; fields nested inside `object`/`list`
 * widgets are out of scope for this slice.
 */
export function findUniqueFieldConflicts(
  collection: CmsCollectionState,
  slug: string,
  data: unknown,
  otherEntries: CmsEntry[],
): UniqueFieldConflict[] {
  const fields = (selectFields(collection, slug) ?? []) as CmsEntryField[];
  const uniqueFields = fields.filter(field => field.unique === true);

  if (uniqueFields.length === 0) {
    return [];
  }

  const candidates = otherEntries.filter(entry => entry.slug !== slug);
  const conflicts: UniqueFieldConflict[] = [];

  for (const field of uniqueFields) {
    const value = (data as Record<string, unknown> | undefined)?.[field.name];
    // Empty values aren't constrained by uniqueness - `required` (if set)
    // already guards presence separately.
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const conflicting = candidates.find(entry => {
      const otherValue = (entry.data as Record<string, unknown> | undefined)?.[field.name];
      return isEqual(otherValue, value);
    });

    if (conflicting) {
      conflicts.push({ field, conflictingSlug: conflicting.slug });
    }
  }

  return conflicts;
}
