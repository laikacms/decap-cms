import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearScheduledPublishAt,
  getAllScheduledPublishes,
  getScheduledPublishAt,
  isPublishAtDue,
  setScheduledPublishAt,
} from '@/core/lib/scheduledPublish';

describe('core/lib/scheduledPublish', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('setScheduledPublishAt / getScheduledPublishAt', () => {
    it('stores and retrieves a publishAt for a collection.slug', () => {
      setScheduledPublishAt('posts', 'my-post', '2026-08-01T00:00:00.000Z');
      expect(getScheduledPublishAt('posts', 'my-post')).toBe('2026-08-01T00:00:00.000Z');
    });

    it('returns undefined when nothing is scheduled', () => {
      expect(getScheduledPublishAt('posts', 'unknown')).toBeUndefined();
    });

    it('keeps entries for different collection.slug pairs independent', () => {
      setScheduledPublishAt('posts', 'a', '2026-08-01T00:00:00.000Z');
      setScheduledPublishAt('posts', 'b', '2026-09-01T00:00:00.000Z');
      expect(getScheduledPublishAt('posts', 'a')).toBe('2026-08-01T00:00:00.000Z');
      expect(getScheduledPublishAt('posts', 'b')).toBe('2026-09-01T00:00:00.000Z');
    });

    it('does not collide when a dotted collection name overlaps a slug boundary', () => {
      setScheduledPublishAt('a.b', 'c', '2026-08-01T00:00:00.000Z');
      setScheduledPublishAt('a', 'b.c', '2026-09-01T00:00:00.000Z');
      expect(getScheduledPublishAt('a.b', 'c')).toBe('2026-08-01T00:00:00.000Z');
      expect(getScheduledPublishAt('a', 'b.c')).toBe('2026-09-01T00:00:00.000Z');
    });
  });

  describe('clearScheduledPublishAt', () => {
    it('removes a stored publishAt', () => {
      setScheduledPublishAt('posts', 'my-post', '2026-08-01T00:00:00.000Z');
      clearScheduledPublishAt('posts', 'my-post');
      expect(getScheduledPublishAt('posts', 'my-post')).toBeUndefined();
    });

    it('is a no-op when nothing is scheduled', () => {
      expect(() => clearScheduledPublishAt('posts', 'my-post')).not.toThrow();
    });
  });

  describe('getAllScheduledPublishes', () => {
    it('returns every stored schedule, one entry per collection+slug pair', () => {
      setScheduledPublishAt('posts', 'a', '2026-08-01T00:00:00.000Z');
      setScheduledPublishAt('pages', 'b', '2026-09-01T00:00:00.000Z');
      expect(Object.values(getAllScheduledPublishes()).sort()).toEqual([
        '2026-08-01T00:00:00.000Z',
        '2026-09-01T00:00:00.000Z',
      ]);
      expect(Object.keys(getAllScheduledPublishes())).toHaveLength(2);
    });
  });

  describe('isPublishAtDue', () => {
    const now = new Date('2026-08-01T12:00:00.000Z');

    it('returns false for undefined/null', () => {
      expect(isPublishAtDue(undefined, now)).toBe(false);
      expect(isPublishAtDue(null, now)).toBe(false);
    });

    it('returns false for an invalid date string', () => {
      expect(isPublishAtDue('not-a-date', now)).toBe(false);
    });

    it('returns false when publishAt is in the future', () => {
      expect(isPublishAtDue('2026-08-02T00:00:00.000Z', now)).toBe(false);
    });

    it('returns true when publishAt is in the past or equal to now', () => {
      expect(isPublishAtDue('2026-07-31T00:00:00.000Z', now)).toBe(true);
      expect(isPublishAtDue('2026-08-01T12:00:00.000Z', now)).toBe(true);
    });
  });
});
