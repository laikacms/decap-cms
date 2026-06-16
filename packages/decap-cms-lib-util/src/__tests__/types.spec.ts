import { isImmutableMap, isImmutableList } from '../types';

describe('isImmutableMap', () => {
  it('returns false for a plain object (no Immutable instances exist)', () => {
    expect(isImmutableMap({})).toBe(false);
  });

  it('returns false for null', () => {
    expect(isImmutableMap(null)).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isImmutableMap([1, 2, 3])).toBe(false);
  });
});

describe('isImmutableList', () => {
  it('returns false for a plain array (no Immutable instances exist)', () => {
    expect(isImmutableList([])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isImmutableList(null)).toBe(false);
  });

  it('returns false for a plain object', () => {
    expect(isImmutableList({})).toBe(false);
  });
});
