import get from 'lodash/get';
import { List, Map } from 'immutable';

import IntegrityIssueTypes from '../constants/integrityIssueTypes';
import { selectEntries } from '../reducers/entries';
import { selectFields } from '../reducers/collections';

import type { IntegrityIssueType } from '../constants/integrityIssueTypes';
import type {
  Collection,
  Collections,
  EntryField,
  EntryFields,
  EntryMap,
  State,
} from '../types/redux';

export type IntegrityIssue = {
  type: IntegrityIssueType;
  collection: string;
  slug: string;
  /** Dotted path to the offending field, e.g. `author` or `authors.0.id`. */
  field: string;
  value: string;
  /** Only set for `DANGLING_RELATION` issues. */
  targetCollection?: string;
  /** Only set for `DUPLICATE_UNIQUE_VALUE` issues. */
  duplicateSlug?: string;
};

type FieldMatch = {
  field: EntryField;
  path: string[];
  value: unknown;
};

function isRecord(value: unknown): value is Map<string, unknown> {
  return Map.isMap(value);
}

/**
 * Walks an entry's `data` alongside its field config, mirroring the
 * fields<->values recursion in `serializeEntryValues.js`, so relation and
 * `unique` checks below see values nested inside `list`/`object` widgets too
 * (unlike the live per-keystroke validators in `Widget.js`, which only see
 * the field being edited). Variable `types` (polymorphic list items) aren't
 * walked - resolving which type definition applies to a stored item needs
 * the type-key discriminator, which is out of scope for this first slice.
 */
function walkFields(
  data: unknown,
  fields: EntryFields | undefined,
  path: string[],
  visit: (match: FieldMatch) => void,
): void {
  if (!fields) {
    return;
  }

  fields.forEach(field => {
    if (!field) {
      return;
    }
    const fieldName = field.get('name');
    const fieldPath = [...path, fieldName];
    const value = isRecord(data) ? data.get(fieldName) : undefined;
    const nestedFields = field.get('fields') as EntryFields | undefined;

    if (nestedFields && List.isList(value)) {
      (value as List<unknown>).forEach((item, index) => {
        walkFields(item, nestedFields, [...fieldPath, String(index)], visit);
      });
      return;
    }

    if (nestedFields && isRecord(value)) {
      walkFields(value, nestedFields, fieldPath, visit);
      return;
    }

    visit({ field, path: fieldPath, value });
  });
}

function stringifyValue(value: unknown): string {
  if (List.isList(value) || Map.isMap(value)) {
    return JSON.stringify((value as List<unknown> | Map<string, unknown>).toJS());
  }
  return String(value);
}

function findDuplicateUniqueValues(
  collection: Collection,
  collectionName: string,
  entries: List<EntryMap | undefined>,
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  // pathKey -> stringified value -> slug of the first entry seen with it
  const seenByPath = new Map<string, Map<string, string>>();

  entries.forEach(entry => {
    if (!entry) {
      return;
    }
    const slug = entry.get('slug');
    const data = entry.get('data');
    const fields = selectFields(collection, slug);

    walkFields(data, fields, [], ({ field, path, value }) => {
      if (!field.get('unique') || value === undefined || value === null || value === '') {
        return;
      }

      const pathKey = path.join('.');
      const stringValue = stringifyValue(value);

      if (!seenByPath.has(pathKey)) {
        seenByPath.set(pathKey, new Map());
      }
      const seenValues = seenByPath.get(pathKey) as Map<string, string>;
      const firstSlug = seenValues.get(stringValue);

      if (firstSlug === undefined) {
        seenValues.set(stringValue, slug);
        return;
      }

      if (firstSlug !== slug) {
        issues.push({
          type: IntegrityIssueTypes.DUPLICATE_UNIQUE_VALUE,
          collection: collectionName,
          slug,
          field: pathKey,
          value: stringValue,
          duplicateSlug: firstSlug,
        });
      }
    });
  });

  return issues;
}

function findDanglingRelations(
  state: State,
  collections: Collections,
  collection: Collection,
  collectionName: string,
  entries: List<EntryMap | undefined>,
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const targetValuesCache = new Map<string, Set<string>>();

  function getTargetValues(
    targetCollectionName: string,
    valueField: string,
  ): Set<string> | undefined {
    const cacheKey = `${targetCollectionName}::${valueField}`;
    if (targetValuesCache.has(cacheKey)) {
      return targetValuesCache.get(cacheKey);
    }

    const targetCollection = collections.get(targetCollectionName) as Collection | undefined;
    if (!targetCollection) {
      return undefined;
    }

    const targetEntries = selectEntries(state.entries, targetCollection);
    const values = new Set<string>();
    (targetEntries || List<EntryMap | undefined>()).forEach(targetEntry => {
      if (!targetEntry) {
        return;
      }
      const targetData = targetEntry.get('data');
      const plainData = isRecord(targetData) ? targetData.toJS() : {};
      const resolved = get(plainData, valueField);
      if (resolved !== undefined && resolved !== null) {
        values.add(String(resolved));
      }
    });

    targetValuesCache.set(cacheKey, values);
    return values;
  }

  entries.forEach(entry => {
    if (!entry) {
      return;
    }
    const slug = entry.get('slug');
    const data = entry.get('data');
    const fields = selectFields(collection, slug);

    walkFields(data, fields, [], ({ field, path, value }) => {
      if (field.get('widget') !== 'relation' || value === undefined || value === null) {
        return;
      }

      const targetCollectionName = field.get('collection') as string | undefined;
      const valueField = (field.get('value_field') || field.get('valueField')) as
        | string
        | undefined;
      if (!targetCollectionName || !valueField) {
        return;
      }

      const targetValues = getTargetValues(targetCollectionName, valueField);
      if (!targetValues) {
        return;
      }

      const values = List.isList(value) ? (value as List<unknown>).toArray() : [value];
      values
        .filter(v => v !== undefined && v !== null && v !== '')
        .forEach(v => {
          const stringValue = String(v);
          if (!targetValues.has(stringValue)) {
            issues.push({
              type: IntegrityIssueTypes.DANGLING_RELATION,
              collection: collectionName,
              slug,
              field: path.join('.'),
              value: stringValue,
              targetCollection: targetCollectionName,
            });
          }
        });
    });
  });

  return issues;
}

/**
 * Scans every loaded collection for two classes of cross-entry integrity
 * problems (DCMS-1422 item 1): relation fields pointing at entries that no
 * longer exist, and duplicate values in fields marked `unique: true`. Both
 * checks only see entries that are already loaded into the `entries` slice
 * (i.e. have been paginated/searched in at some point during this session),
 * since decap-cms doesn't otherwise keep a full in-memory index of every
 * collection's entries.
 */
export function selectIntegrityIssues(state: State): IntegrityIssue[] {
  const collections = state.collections;
  if (!collections) {
    return [];
  }

  const collectionNames = collections.keySeq().toArray() as string[];

  return collectionNames.reduce<IntegrityIssue[]>((issues, collectionName) => {
    const collection = collections.get(collectionName) as Collection | undefined;
    if (!collection) {
      return issues;
    }

    const entries = selectEntries(state.entries, collection);
    if (!entries || entries.isEmpty()) {
      return issues;
    }

    issues.push(...findDuplicateUniqueValues(collection, collectionName, entries));
    issues.push(...findDanglingRelations(state, collections, collection, collectionName, entries));

    return issues;
  }, []);
}
