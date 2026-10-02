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

  it('treats whitespace-only strings as no value so start still applies', () => {
    const startFields = [
      { name: 'ticketId', label: 'Ticket ID', widget: 'autoincrement', start: 1000 },
    ] as CmsEntryField[];
    for (const blank of [' ', '\n', '\t ']) {
      const values = computeAutoincrementValues(startFields, [makeEntry('a', { ticketId: blank })]);
      expect(values).toEqual({ ticketId: 1000 });
    }
  });

  it('ignores hex, binary and octal prefixed strings', () => {
    for (const raw of ['0x10', '0b11', '0o7']) {
      const values = computeAutoincrementValues(fields, [
        makeEntry('a', { ticketId: raw }),
        makeEntry('b', { ticketId: 3 }),
      ]);
      expect(values).toEqual({ ticketId: 4 });
    }
  });

  it('ignores exponent notation strings (1e3 is not a plain decimal)', () => {
    const values = computeAutoincrementValues(fields, [
      makeEntry('a', { ticketId: '1e3' }),
      makeEntry('b', { ticketId: 3 }),
    ]);
    expect(values).toEqual({ ticketId: 4 });
  });

  it('accepts surrounding whitespace around a plain decimal string', () => {
    const values = computeAutoincrementValues(fields, [makeEntry('a', { ticketId: ' 12 ' })]);
    expect(values).toEqual({ ticketId: 13 });
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

describe('computeAutoincrementValues - nested object fields (DCMS-2587)', () => {
  const fields = [
    {
      name: 'meta',
      label: 'Meta',
      widget: 'object',
      fields: [
        { name: 'ticketId', label: 'Ticket', widget: 'autoincrement' },
        {
          name: 'inner',
          label: 'Inner',
          widget: 'object',
          fields: [{ name: 'seq', label: 'Seq', widget: 'autoincrement', start: 100 }],
        },
      ],
    },
  ] as unknown as CmsEntryField[];

  it('detects nested autoincrement fields', () => {
    expect(hasAutoincrementFields(fields)).toBe(true);
  });

  it('uses start for nested fields when no entry has a value', () => {
    expect(computeAutoincrementValues(fields, [])).toEqual({ meta: { ticketId: 1, inner: { seq: 100 } } });
  });

  it('computes max + 1 per nested field across entries', () => {
    const entries = [
      makeEntry('a', { meta: { ticketId: 4, inner: { seq: 101 } } }),
      makeEntry('b', { meta: { ticketId: 9 } }),
      makeEntry('c', { meta: 'bogus' }),
      makeEntry('d', {}),
    ];
    expect(computeAutoincrementValues(fields, entries)).toEqual({ meta: { ticketId: 10, inner: { seq: 102 } } });
  });

  it('does not recurse into list widgets', () => {
    const listFields = [
      {
        name: 'items',
        label: 'Items',
        widget: 'list',
        fields: [{ name: 'n', label: 'N', widget: 'autoincrement' }],
      },
    ] as unknown as CmsEntryField[];
    expect(hasAutoincrementFields(listFields)).toBe(false);
    expect(computeAutoincrementValues(listFields, [])).toEqual({});
  });
});
