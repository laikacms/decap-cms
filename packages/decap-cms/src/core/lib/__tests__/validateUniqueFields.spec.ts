import { describe, expect, it } from 'vitest';

import { FOLDER } from '@/core/constants/collectionTypes';
import { findUniqueFieldConflicts } from '@/core/lib/validateUniqueFields';

import type { CmsEntry } from '@/lib/util/index';

function makeCollection(fields: Record<string, unknown>[]) {
  return {
    name: 'posts',
    type: FOLDER,
    folder: '_posts',
    fields,
  } as never;
}

function makeEntry(slug: string, data: Record<string, unknown>): CmsEntry {
  return {
    path: `_posts/${slug}.md`,
    slug,
    data,
    collection: 'posts',
    mediaFiles: [],
    meta: {},
  } as CmsEntry;
}

describe('findUniqueFieldConflicts', () => {
  const collection = makeCollection([
    { name: 'title', label: 'Title', widget: 'string' },
    { name: 'email', label: 'Email', widget: 'string', unique: true },
  ]);

  it('reports no conflict when the value is not used by any other entry', () => {
    const otherEntries = [
      makeEntry('post-a', { title: 'A', email: 'a@example.com' }),
      makeEntry('post-b', { title: 'B', email: 'b@example.com' }),
    ];

    const conflicts = findUniqueFieldConflicts(
      collection,
      'post-c',
      { title: 'C', email: 'c@example.com' },
      otherEntries,
    );

    expect(conflicts).toEqual([]);
  });

  it('reports a conflict when another entry already holds the same value', () => {
    const otherEntries = [
      makeEntry('post-a', { title: 'A', email: 'shared@example.com' }),
      makeEntry('post-b', { title: 'B', email: 'b@example.com' }),
    ];

    const conflicts = findUniqueFieldConflicts(
      collection,
      'post-c',
      { title: 'C', email: 'shared@example.com' },
      otherEntries,
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].field.name).toBe('email');
    expect(conflicts[0].conflictingSlug).toBe('post-a');
  });

  it('excludes the entry being saved from its own conflict check', () => {
    // Saving `post-a` unmodified (or with any other change) must not
    // conflict with the copy of itself already present in `otherEntries`.
    const otherEntries = [
      makeEntry('post-a', { title: 'A', email: 'a@example.com' }),
      makeEntry('post-b', { title: 'B', email: 'b@example.com' }),
    ];

    const conflicts = findUniqueFieldConflicts(
      collection,
      'post-a',
      { title: 'A (edited)', email: 'a@example.com' },
      otherEntries,
    );

    expect(conflicts).toEqual([]);
  });

  it('ignores fields without unique: true', () => {
    const otherEntries = [
      makeEntry('post-a', { title: 'Same title', email: 'a@example.com' }),
    ];

    const conflicts = findUniqueFieldConflicts(
      collection,
      'post-b',
      { title: 'Same title', email: 'b@example.com' },
      otherEntries,
    );

    expect(conflicts).toEqual([]);
  });

  it('does not treat empty values as conflicting with each other', () => {
    const otherEntries = [
      makeEntry('post-a', { title: 'A', email: '' }),
      makeEntry('post-b', { title: 'B' }),
    ];

    const conflicts = findUniqueFieldConflicts(
      collection,
      'post-c',
      { title: 'C', email: '' },
      otherEntries,
    );

    expect(conflicts).toEqual([]);
  });

  it('returns no conflicts when the collection has no unique fields', () => {
    const plainCollection = makeCollection([{ name: 'title', label: 'Title', widget: 'string' }]);
    const otherEntries = [makeEntry('post-a', { title: 'Same' })];

    const conflicts = findUniqueFieldConflicts(
      plainCollection,
      'post-b',
      { title: 'Same' },
      otherEntries,
    );

    expect(conflicts).toEqual([]);
  });
});
