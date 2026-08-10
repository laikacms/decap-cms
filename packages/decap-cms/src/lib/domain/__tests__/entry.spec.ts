import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createEntry,
  createProjectedEntry,
  isComplete,
  isProjected,
} from '@/lib/domain/index';

import type { CompleteEntry, Entry, EntryBase, ProjectedEntry } from '@/lib/domain/index';

const base: EntryBase = {
  collection: 'posts',
  slug: 'hello',
  path: 'content/posts/hello.md',
  data: { title: 'Hello' },
};

describe('domain entry factories', () => {
  it('marks entries built with createEntry as complete', () => {
    const entry = createEntry(base);
    expect(entry.projected).toBe(false);
    expect(isComplete(entry)).toBe(true);
    expect(isProjected(entry)).toBe(false);
  });

  it('marks entries built with createProjectedEntry as projected', () => {
    const entry = createProjectedEntry(base);
    expect(entry.projected).toBe(true);
    expect(isProjected(entry)).toBe(true);
    expect(isComplete(entry)).toBe(false);
  });

  it('carries the base fields through unchanged', () => {
    const withOptionals = createEntry({
      ...base,
      author: { name: 'Ada' },
      updatedOn: '2026-08-10T09:00:00.000Z',
      i18n: { nl: { data: { title: 'Hallo' } } },
    });

    expect(withOptionals).toEqual({
      ...base,
      author: { name: 'Ada' },
      updatedOn: '2026-08-10T09:00:00.000Z',
      i18n: { nl: { data: { title: 'Hallo' } } },
      projected: false,
    });
  });

  it('omits absent optionals rather than setting them to undefined', () => {
    // The absence-over-explicit-undefined convention: a domain entry built
    // without an author has no `author` key at all, so it survives JSON round
    // trips and spread merges with its meaning intact.
    expect(Object.keys(createEntry(base)).sort()).toEqual([
      'collection',
      'data',
      'path',
      'projected',
      'slug',
    ]);
  });
});

describe('domain entry types', () => {
  it('narrows the union through the guards', () => {
    function narrow(entry: Entry) {
      if (isProjected(entry)) {
        expectTypeOf(entry).toEqualTypeOf<ProjectedEntry>();
      } else {
        expectTypeOf(entry).toEqualTypeOf<CompleteEntry>();
      }
    }
    expect(narrow).toBeTypeOf('function');
  });

  it('accepts a complete entry where CompleteEntry is required', () => {
    expectTypeOf(createEntry(base)).toExtend<CompleteEntry>();
  });

  it('rejects a projected entry where CompleteEntry is required', () => {
    // Writes (draft creation, persist, publish) take `CompleteEntry`, so
    // handing them a search projection is a compile error whose fix is a
    // refetch rather than a cast.
    expectTypeOf(createProjectedEntry(base)).not.toExtend<CompleteEntry>();
  });

  it('keeps the projected flag as the sole discriminant', () => {
    expectTypeOf<Entry>().toEqualTypeOf<CompleteEntry | ProjectedEntry>();
    expectTypeOf<Omit<CompleteEntry, 'projected'>>().toEqualTypeOf<EntryBase>();
    expectTypeOf<Omit<ProjectedEntry, 'projected'>>().toEqualTypeOf<EntryBase>();
  });
});
