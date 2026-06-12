import { Map as ImmutableMap, List } from 'immutable';

import { isImmutableMap, isImmutableList } from '../types';

describe('isImmutableMap', () => {
  it('returns true for an ImmutableMap instance', () => {
    expect(isImmutableMap(ImmutableMap({ key: 'value' }))).toBe(true);
  });

  it('returns false for a plain object', () => {
    expect(isImmutableMap({})).toBe(false);
  });

  it('returns false for an ImmutableList instance', () => {
    expect(isImmutableMap(List([1, 2, 3]))).toBe(false);
  });
});

describe('isImmutableList', () => {
  it('returns true for a List instance', () => {
    expect(isImmutableList(List([1, 2, 3]))).toBe(true);
  });

  it('returns false for a plain array', () => {
    expect(isImmutableList([])).toBe(false);
  });

  it('returns false for an ImmutableMap instance', () => {
    expect(isImmutableList(ImmutableMap({ key: 'value' }))).toBe(false);
  });
});
