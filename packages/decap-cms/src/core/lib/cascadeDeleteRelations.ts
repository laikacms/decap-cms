import { isEqual } from 'lodash-es';

import type { CmsCollectionState, CmsEntry, CmsEntryField, CmsFieldRelation } from '@/lib/util/index';

export type CascadeDeleteReference = {
  collectionName: string,
  entry: CmsEntry,
  field: CmsEntryField & CmsFieldRelation,
  /** The deleted entry's value for the field's `value_field`, i.e. the value being cleared. */
  deletedValue: unknown,
};

/**
 * DCMS-1422 (partial - cascade delete): the `value_field` a `relation` field
 * resolves against the target entry, restricted to plain top-level field
 * names. Templated (`{{...}}`) or dotted/nested paths need the same template
 * resolution `RelationControl.tsx#parseNestedFields` performs against a full
 * search hit, which isn't available from a bare `CmsEntry` here - out of
 * scope for this slice, same restriction `getQuickAddFieldNames` applies.
 */
function getSimpleValueField(field: CmsEntryField & CmsFieldRelation): string | undefined {
  const valueField = (field.value_field ?? field.valueField) as string | undefined;
  if (!valueField || valueField.includes('{{') || valueField.includes('.')) {
    return undefined;
  }
  return valueField;
}

/**
 * Scans every field in `collections` for a `relation` field pointing at
 * `deletedCollectionName`, and reports every entry (fetched on demand via
 * `entriesByCollection`, e.g. `selectEntries`) whose value for that field
 * matches `deletedEntry`'s value for the relation's `value_field`.
 *
 * Only relation fields with a plain (non-templated, non-nested)
 * `value_field` are checked (see `getSimpleValueField`), and only
 * currently-known entries (whatever `entriesByCollection` returns) are
 * scanned - collections/entries that haven't been loaded into the store yet
 * are invisible to this check, same limitation `findUniqueFieldConflicts`
 * (DCMS-1422, unique fields) accepts for the same reason.
 */
export function findCascadeDeleteReferences(
  collections: Record<string, CmsCollectionState>,
  deletedCollectionName: string,
  deletedEntry: CmsEntry,
  entriesByCollection: (collectionName: string) => CmsEntry[],
): CascadeDeleteReference[] {
  const references: CascadeDeleteReference[] = [];

  for (const collection of Object.values(collections)) {
    const fields = (collection.fields ?? []) as (CmsEntryField & CmsFieldRelation)[];

    for (const field of fields) {
      if (field.widget !== 'relation' || field.collection !== deletedCollectionName) {
        continue;
      }

      const valueField = getSimpleValueField(field);
      if (!valueField) continue;

      const deletedValue = (deletedEntry.data as Record<string, unknown> | undefined)?.[valueField];
      if (deletedValue === undefined || deletedValue === null || deletedValue === '') {
        continue;
      }

      const entries = entriesByCollection(collection.name);
      for (const entry of entries) {
        const raw = (entry.data as Record<string, unknown> | undefined)?.[field.name];
        const references_ = field.multiple
          ? Array.isArray(raw) && raw.some(v => isEqual(v, deletedValue))
          : isEqual(raw, deletedValue);

        if (references_) {
          references.push({ collectionName: collection.name, entry, field, deletedValue });
        }
      }
    }
  }

  return references;
}

/**
 * Clears every reference in `references` that targets `entry`, returning a
 * new `CmsEntry` with the affected relation fields updated (the matching
 * value removed from `multiple` fields, or the field cleared entirely for
 * single-value fields). `references` not targeting `entry` are ignored, so
 * callers can pass the full reference list per entry without pre-filtering.
 */
export function clearReferencesOnEntry(
  entry: CmsEntry,
  references: CascadeDeleteReference[],
): CmsEntry {
  const data = { ...(entry.data as Record<string, unknown>) };

  for (const reference of references) {
    if (reference.entry.slug !== entry.slug || reference.collectionName !== entry.collection) {
      continue;
    }

    if (reference.field.multiple) {
      const current = data[reference.field.name];
      data[reference.field.name] = Array.isArray(current)
        ? current.filter(v => !isEqual(v, reference.deletedValue))
        : current;
    } else {
      data[reference.field.name] = undefined;
    }
  }

  return { ...entry, data };
}
