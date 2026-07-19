import { fromJS, Map } from 'immutable';

import { hasActiveFilter, isFilterActive } from '../FilterControl';

describe('hasActiveFilter', () => {
  it('returns undefined for an undefined filter', () => {
    expect(hasActiveFilter(undefined)).toBeUndefined();
  });

  it('returns false for an empty filter Map', () => {
    expect(hasActiveFilter(Map())).toBe(false);
  });

  it('returns false when no filter is active', () => {
    const filter = fromJS({
      filter1: { active: false },
      filter2: { active: false },
    });
    expect(hasActiveFilter(filter)).toBe(false);
  });

  it('returns true when one filter is active', () => {
    const filter = fromJS({
      filter1: { active: false },
      filter2: { active: true },
    });
    expect(hasActiveFilter(filter)).toBe(true);
  });

  it('returns true when multiple filters are active', () => {
    const filter = fromJS({
      filter1: { active: true },
      filter2: { active: true },
    });
    expect(hasActiveFilter(filter)).toBe(true);
  });
});

describe('isFilterActive', () => {
  it('returns false for an empty filter Map', () => {
    expect(isFilterActive(Map(), 'filter1')).toBe(false);
  });

  it('returns false when the filter id is not present', () => {
    const filter = fromJS({
      filter1: { active: true },
    });
    expect(isFilterActive(filter, 'filter2')).toBe(false);
  });

  it('returns false when the filter id is present but inactive', () => {
    const filter = fromJS({
      filter1: { active: false },
    });
    expect(isFilterActive(filter, 'filter1')).toBe(false);
  });

  it('returns true when the filter id is present and active', () => {
    const filter = fromJS({
      filter1: { active: true },
    });
    expect(isFilterActive(filter, 'filter1')).toBe(true);
  });
});
