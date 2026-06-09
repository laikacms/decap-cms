import { sortKeys } from '../helpers';

describe('sortKeys', () => {
  const keys = ['alpha', 'beta', 'gamma'];

  it('returns negative when a comes before b in sortedKeys', () => {
    const comparator = sortKeys(keys);
    expect(comparator('alpha', 'beta')).toBeLessThan(0);
  });

  it('returns positive when a comes after b in sortedKeys', () => {
    const comparator = sortKeys(keys);
    expect(comparator('gamma', 'alpha')).toBeGreaterThan(0);
  });

  it('returns 0 when a is absent from sortedKeys', () => {
    const comparator = sortKeys(keys);
    expect(comparator('missing', 'alpha')).toBe(0);
  });

  it('returns 0 when b is absent from sortedKeys', () => {
    const comparator = sortKeys(keys);
    expect(comparator('alpha', 'missing')).toBe(0);
  });

  it('returns 0 when both keys are absent from sortedKeys', () => {
    const comparator = sortKeys(keys);
    expect(comparator('nope', 'also-nope')).toBe(0);
  });

  it('returns 0 when a and b are the same key', () => {
    const comparator = sortKeys(keys);
    expect(comparator('beta', 'beta')).toBe(0);
  });

  it('uses a custom selector function to extract the key from items', () => {
    type Item = { name: string };
    const comparator = sortKeys<Item>(keys, item => item.name);
    expect(comparator({ name: 'alpha' }, { name: 'gamma' })).toBeLessThan(0);
    expect(comparator({ name: 'gamma' }, { name: 'beta' })).toBeGreaterThan(0);
    expect(comparator({ name: 'missing' }, { name: 'beta' })).toBe(0);
  });
});
