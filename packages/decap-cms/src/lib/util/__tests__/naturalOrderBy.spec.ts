import { describe, expect, it } from 'vitest';

import { naturalOrderBy } from '@/lib/util/naturalOrderBy';

describe('naturalOrderBy', () => {
  it('sorts numbered string titles in natural order, not lexicographic order (dcms-2236)', () => {
    const entries = [
      { title: 'This is post # 1' },
      { title: 'This is post # 10' },
      { title: 'This is post # 11' },
      { title: 'This is post # 2' },
      { title: 'This is post # 20' },
      { title: 'This is post # 3' },
    ];

    expect(naturalOrderBy(entries, 'title', 'asc')).toEqual([
      { title: 'This is post # 1' },
      { title: 'This is post # 2' },
      { title: 'This is post # 3' },
      { title: 'This is post # 10' },
      { title: 'This is post # 11' },
      { title: 'This is post # 20' },
    ]);
  });

  it('sorts "post # 2" before "post # 10" ascending and after it descending', () => {
    const entries = [{ title: 'post # 10' }, { title: 'post # 2' }];

    expect(naturalOrderBy(entries, 'title', 'asc')).toEqual([
      { title: 'post # 2' },
      { title: 'post # 10' },
    ]);
    expect(naturalOrderBy(entries, 'title', 'desc')).toEqual([
      { title: 'post # 10' },
      { title: 'post # 2' },
    ]);
  });

  it('keeps numeric fields sorted purely numerically (no regression)', () => {
    const entries = [{ value: 10 }, { value: 2 }, { value: 1 }, { value: 20 }];

    expect(naturalOrderBy(entries, 'value', 'asc')).toEqual([
      { value: 1 },
      { value: 2 },
      { value: 10 },
      { value: 20 },
    ]);
  });

  it('keeps date fields sorted chronologically (no regression)', () => {
    const entries = [
      { publishedOn: '2026-01-05T00:00:00.000Z' },
      { publishedOn: '2025-12-25T00:00:00.000Z' },
      { publishedOn: '2026-02-01T00:00:00.000Z' },
    ];

    expect(naturalOrderBy(entries, 'publishedOn', 'asc')).toEqual([
      { publishedOn: '2025-12-25T00:00:00.000Z' },
      { publishedOn: '2026-01-05T00:00:00.000Z' },
      { publishedOn: '2026-02-01T00:00:00.000Z' },
    ]);

    const dateEntries = [
      { publishedOn: new Date('2026-01-05') },
      { publishedOn: new Date('2025-12-25') },
      { publishedOn: new Date('2026-02-01') },
    ];

    expect(naturalOrderBy(dateEntries, 'publishedOn', 'asc')).toEqual([
      { publishedOn: new Date('2025-12-25') },
      { publishedOn: new Date('2026-01-05') },
      { publishedOn: new Date('2026-02-01') },
    ]);
  });

  it('sorts nested paths and supports multiple keys/orders', () => {
    const entries = [
      { data: { title: 'B', order: 2 } },
      { data: { title: 'A', order: 1 } },
      { data: { title: 'A', order: 0 } },
    ];

    expect(naturalOrderBy(entries, ['data.title', 'data.order'], ['asc', 'asc'])).toEqual([
      { data: { title: 'A', order: 0 } },
      { data: { title: 'A', order: 1 } },
      { data: { title: 'B', order: 2 } },
    ]);
  });

  it('sorts nullish values to the end for ascending order, like lodash orderBy', () => {
    const entries = [{ title: 'b' }, { title: undefined }, { title: 'a' }];

    expect(naturalOrderBy(entries, 'title', 'asc')).toEqual([
      { title: 'a' },
      { title: 'b' },
      { title: undefined },
    ]);
  });
});
