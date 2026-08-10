import { describe, expect, it } from 'vitest';

import { isContent } from '@/entry-codecs/markdown/index';

describe('isContent', () => {
  it('returns true for a valid content object', () => {
    expect(isContent({ body: 'Content' })).toBe(true);
    expect(isContent({ title: 'Title', body: 'Content' })).toBe(true);
    expect(isContent({})).toBe(true);
  });

  it('returns false for a string', () => {
    expect(isContent('Content')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isContent(42)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isContent(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isContent(undefined)).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isContent([])).toBe(false);
    expect(isContent(['Content'])).toBe(false);
  });
});
