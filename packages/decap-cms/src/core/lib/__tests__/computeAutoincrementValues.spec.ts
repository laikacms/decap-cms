import { describe, expect, it } from 'vitest';

import { computeAutoincrementValues, hasAutoincrementFields } from '@/core/lib/computeAutoincrementValues';

import type { CmsEntry, CmsEntryField } from '@/lib/util/index';

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

describe('computeAutoincrementValues', () => {
  const fields = [
    { name: 'title', label: 'Title', widget: 'string' },
    { name: 'ticketId', label: 'Ticket ID', widget: 'autoincrement' },
  ] as CmsEntryField[];

  it('returns start (default 1) when no existing entry has a value', () => {
    const values = computeAutoincrementValues(fields, []);
    expect(values).toEqual({ ticketId: 1 });
  });

  it('returns max + 1 across existing entries', () => {
    const existingEntries = [
      makeEntry('a', { title: 'A', ticketId: 3 }),
      makeEntry('b', { title: 'B', ticketId: 7 }),
      makeEntry('c', { title: 'C', ticketId: 5 }),
    ];

    const values = computeAutoincrementValues(fields, existingEntries);
    expect(values).toEqual({ ticketId: 8 });
  });

  it('honors a configured start value when no existing entry has one', () => {
    const startFields = [
      { name: 'ticketId', label: 'Ticket ID', widget: 'autoincrement', start: 1000 },
    ] as CmsEntryField[];

    const values = computeAutoincrementValues(startFields, []);
    expect(values).toEqual({ ticketId: 1000 });
  });

  it('ignores the configured start once real values exist (max + 1 wins)', () => {
    const startFields = [
      { name: 'ticketId', label: 'Ticket ID', widget: 'autoincrement', start: 1000 },
    ] as CmsEntryField[];
    const existingEntries = [makeEntry('a', { ticketId: 5 })];

    const values = computeAutoincrementValues(startFields, existingEntries);
    expect(values).toEqual({ ticketId: 6 });
  });

  it('tolerates string-coded numeric values from entries edited out-of-band', () => {
    const existingEntries = [makeEntry('a', { ticketId: '9' })];
    const values = computeAutoincrementValues(fields, existingEntries);
    expect(values).toEqual({ ticketId: 10 });
  });

  it('ignores entries with a missing or non-numeric value for the field', () => {
    const existingEntries = [
      makeEntry('a', { ticketId: undefined }),
      makeEntry('b', { ticketId: 'not-a-number' }),
      makeEntry('c', { ticketId: 4 }),
    ];

    const values = computeAutoincrementValues(fields, existingEntries);
    expect(values).toEqual({ ticketId: 5 });
  });

  it('returns an empty object when the collection has no autoincrement fields', () => {
    const plainFields = [{ name: 'title', label: 'Title', widget: 'string' }] as CmsEntryField[];
    const values = computeAutoincrementValues(plainFields, [makeEntry('a', { title: 'A' })]);
    expect(values).toEqual({});
  });

  it('computes independent values for multiple autoincrement fields', () => {
    const multiFields = [
      { name: 'ticketId', widget: 'autoincrement' },
      { name: 'orderNumber', widget: 'autoincrement', start: 100 },
    ] as CmsEntryField[];
    const existingEntries = [makeEntry('a', { ticketId: 2 })];

    const values = computeAutoincrementValues(multiFields, existingEntries);
    expect(values).toEqual({ ticketId: 3, orderNumber: 100 });
  });
});

describe('hasAutoincrementFields', () => {
  it('is true when a field uses the autoincrement widget', () => {
    const fields = [
      { name: 'title', label: 'Title', widget: 'string' },
      { name: 'ticketId', label: 'Ticket ID', widget: 'autoincrement' },
    ] as CmsEntryField[];
    expect(hasAutoincrementFields(fields)).toBe(true);
  });

  it('is false otherwise', () => {
    const plainFields = [{ name: 'title', widget: 'string' }] as CmsEntryField[];
    expect(hasAutoincrementFields(plainFields)).toBe(false);
  });
});
