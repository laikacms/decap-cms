import { describe, expect, it } from 'vitest';

import { UNPUBLISHED_ENTRIES_SUCCESS } from '@/core/actions/editorialWorkflow';
import unpublishedEntries from '@/core/reducers/editorialWorkflow';

describe('unpublishedEntries reducer', () => {
  it('should return the default state on an empty action', () => {
    const result = unpublishedEntries(undefined, { type: 'UNKNOWN' });
    expect(result).toEqual({ entities: {}, pages: {} });
  });

  describe('UNPUBLISHED_ENTRIES_SUCCESS', () => {
    it('should set entities keyed by collection.slug and store page ids', () => {
      const entries = [
        { collection: 'posts', slug: 'first-post', status: 'draft' },
        { collection: 'posts', slug: 'second-post', status: 'pending_review' },
      ];

      const result = unpublishedEntries(undefined, {
        type: UNPUBLISHED_ENTRIES_SUCCESS,
        payload: {
          entries,
          pages: { count: 2 },
        },
      });

      expect(result.entities).toEqual({
        'posts.first-post': { ...entries[0], isFetching: false },
        'posts.second-post': { ...entries[1], isFetching: false },
      });
      expect(result.pages).toEqual({
        count: 2,
        ids: ['first-post', 'second-post'],
      });
    });

    it('should overwrite previous entities and pages', () => {
      const initialState = {
        entities: {
          'posts.stale-post': { collection: 'posts', slug: 'stale-post' },
        },
        pages: { isFetching: true },
      };

      const entries = [{ collection: 'posts', slug: 'fresh-post', status: 'draft' }];

      const result = unpublishedEntries(initialState, {
        type: UNPUBLISHED_ENTRIES_SUCCESS,
        payload: {
          entries,
          pages: {},
        },
      });

      expect(result.entities).toEqual({
        'posts.stale-post': { collection: 'posts', slug: 'stale-post' },
        'posts.fresh-post': { ...entries[0], isFetching: false },
      });
      expect(result.pages).toEqual({ ids: ['fresh-post'] });
    });
  });
});
