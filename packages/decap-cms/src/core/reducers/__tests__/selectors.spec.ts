import { describe, expect, it } from 'vitest';

import { selectSearchedEntries } from '@/core/reducers/selectors';

describe('selectSearchedEntries', () => {
  it('filters out entries from unavailable or unknown collections', () => {
    const state = {
      search: {
        entryIds: [
          { collection: 'posts', slug: 'a' },
          { collection: 'pages', slug: 'b' },
          { collection: 'unknown', slug: 'c' },
        ],
      },
      entries: {
        entities: {
          'posts.a': { slug: 'a', collection: 'posts' },
          'pages.b': { slug: 'b', collection: 'pages' },
        },
      },
    };

    const result = selectSearchedEntries(state, ['posts']);

    expect(result).toEqual([{ slug: 'a', collection: 'posts' }]);
  });

  it('maps entry ids to full entry objects for available collections', () => {
    const state = {
      search: {
        entryIds: [
          { collection: 'posts', slug: 'a' },
          { collection: 'posts', slug: 'b' },
          { collection: 'pages', slug: 'c' },
        ],
      },
      entries: {
        entities: {
          'posts.a': { slug: 'a', collection: 'posts', title: 'A' },
          'posts.b': { slug: 'b', collection: 'posts', title: 'B' },
          'pages.c': { slug: 'c', collection: 'pages', title: 'C' },
        },
      },
    };

    const result = selectSearchedEntries(state, ['posts', 'pages']);

    expect(result).toEqual([
      { slug: 'a', collection: 'posts', title: 'A' },
      { slug: 'b', collection: 'posts', title: 'B' },
      { slug: 'c', collection: 'pages', title: 'C' },
    ]);
  });

  it('drops entry ids that have no matching entry entity', () => {
    const state = {
      search: {
        entryIds: [
          { collection: 'posts', slug: 'a' },
          { collection: 'posts', slug: 'missing' },
        ],
      },
      entries: {
        entities: {
          'posts.a': { slug: 'a', collection: 'posts' },
        },
      },
    };

    const result = selectSearchedEntries(state, ['posts']);

    expect(result).toEqual([{ slug: 'a', collection: 'posts' }]);
  });

  it('returns an empty array when no entry ids are available', () => {
    const state = {
      search: { entryIds: [] },
      entries: { entities: {} },
    };

    expect(selectSearchedEntries(state, ['posts'])).toEqual([]);
  });
});
