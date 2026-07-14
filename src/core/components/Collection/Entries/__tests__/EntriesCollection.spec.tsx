import { describe, expect, it } from 'vitest';

import { filterNestedEntries } from '@/core/components/Collection/Entries/EntriesCollection';

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
