import { describe, expect, it } from 'vitest';

import {
  filterEntriesBySearchQuery,
  filterNestedEntries,
} from '@/core/components/Collection/Entries/EntriesCollection';

describe('filterNestedEntries', () => {
  it('should return only immediate children for non root path', () => {
    const entriesArray = [
      { slug: 'index', path: 'src/pages/index.md', data: { title: 'Root' } },
      { slug: 'dir1/index', path: 'src/pages/dir1/index.md', data: { title: 'File 1' } },
      { slug: 'dir1/dir2/index', path: 'src/pages/dir1/dir2/index.md', data: { title: 'File 2' } },
      { slug: 'dir3/index', path: 'src/pages/dir3/index.md', data: { title: 'File 3' } },
      { slug: 'dir3/dir4/index', path: 'src/pages/dir3/dir4/index.md', data: { title: 'File 4' } },
    ];
    const entries = entriesArray;
    expect(filterNestedEntries('dir3', 'src/pages', entries)).toEqual([
      { slug: 'dir3/index', path: 'src/pages/dir3/index.md', data: { title: 'File 3' } },
    ]);
  });

  it('should return only immediate children for root path', () => {
    const entriesArray = [
      { slug: 'index', path: 'src/pages/index.md', data: { title: 'Root' } },
      { slug: 'dir1/index', path: 'src/pages/dir1/index.md', data: { title: 'File 1' } },
      { slug: 'dir1/dir2/index', path: 'src/pages/dir1/dir2/index.md', data: { title: 'File 2' } },
      { slug: 'dir3/index', path: 'src/pages/dir3/index.md', data: { title: 'File 3' } },
      { slug: 'dir3/dir4/index', path: 'src/pages/dir3/dir4/index.md', data: { title: 'File 4' } },
    ];
    const entries = entriesArray;
    expect(filterNestedEntries('', 'src/pages', entries)).toEqual([
      { slug: 'index', path: 'src/pages/index.md', data: { title: 'Root' } },
    ]);
  });
});

describe('filterEntriesBySearchQuery (DCMS-1229)', () => {
  const collection = {
    name: 'posts',
    label: 'Posts',
    folder: 'src/posts',
    fields: [{ name: 'title', widget: 'string' }],
  } as any;

  const entries = [
    { slug: 'hello-world', path: 'src/posts/hello-world.md', data: { title: 'Hello World' } },
    { slug: 'goodbye', path: 'src/posts/goodbye.md', data: { title: 'Goodbye Moon' } },
  ] as any;

  it('returns all entries unchanged when the query is empty or blank', () => {
    expect(filterEntriesBySearchQuery(collection, entries, '')).toBe(entries);
    expect(filterEntriesBySearchQuery(collection, entries, '   ')).toBe(entries);
    expect(filterEntriesBySearchQuery(collection, entries, undefined)).toBe(entries);
  });

  it('filters entries whose inferred title matches the query, case-insensitively', () => {
    expect(filterEntriesBySearchQuery(collection, entries, 'hello')).toEqual([entries[0]]);
    expect(filterEntriesBySearchQuery(collection, entries, 'GOODBYE')).toEqual([entries[1]]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterEntriesBySearchQuery(collection, entries, 'no such entry')).toEqual([]);
  });
});
