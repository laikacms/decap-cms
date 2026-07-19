import { fromJS, Map } from 'immutable';

import { hasActiveGroup, isGroupActive } from '../GroupControl';

describe('hasActiveGroup', () => {
  it('returns undefined for an undefined group', () => {
    expect(hasActiveGroup(undefined)).toBeUndefined();
  });

  it('returns false for an empty group Map', () => {
    expect(hasActiveGroup(Map())).toBe(false);
  });

  it('returns false when no group is active', () => {
    const group = fromJS({
      group1: { active: false },
      group2: { active: false },
    });
    expect(hasActiveGroup(group)).toBe(false);
  });

  it('returns true when one group is active', () => {
    const group = fromJS({
      group1: { active: false },
      group2: { active: true },
    });
    expect(hasActiveGroup(group)).toBe(true);
  });

  it('returns true when multiple groups are active', () => {
    const group = fromJS({
      group1: { active: true },
      group2: { active: true },
    });
    expect(hasActiveGroup(group)).toBe(true);
  });
});

describe('isGroupActive', () => {
  it('returns false for an empty group Map', () => {
    expect(isGroupActive(Map(), 'group1')).toBe(false);
  });

  it('returns false when the group id is not present', () => {
    const group = fromJS({
      group1: { active: true },
    });
    expect(isGroupActive(group, 'group2')).toBe(false);
  });

  it('returns false when the group id is present but inactive', () => {
    const group = fromJS({
      group1: { active: false },
    });
    expect(isGroupActive(group, 'group1')).toBe(false);
  });

  it('returns true when the group id is present and active', () => {
    const group = fromJS({
      group1: { active: true },
    });
    expect(isGroupActive(group, 'group1')).toBe(true);
  });
});
