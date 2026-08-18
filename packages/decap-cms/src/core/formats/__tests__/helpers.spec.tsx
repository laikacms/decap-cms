import { describe, expect, it } from 'vitest';

import { sortKeys } from '@/core/formats/helpers';

describe('sortKeys', () => {
  it('orders items according to the provided key order', () => {
    const items = ['c', 'a', 'b'];
    expect([...items].sort(sortKeys(['a', 'b', 'c']))).toEqual(['a', 'b', 'c']);
  });

  it('uses the selector to derive the comparison key from each item', () => {
    const items = [{ key: 'c' }, { key: 'a' }, { key: 'b' }];
    const sorted = [...items].sort(sortKeys(['a', 'b', 'c'], item => item.key));
    expect(sorted.map(item => item.key)).toEqual(['a', 'b', 'c']);
  });

  it('treats items missing from the key order as equal, leaving them in place', () => {
    const compare = sortKeys(['a', 'b']);
    expect(compare('x', 'a')).toBe(0);
    expect(compare('a', 'x')).toBe(0);
    expect(compare('x', 'y')).toBe(0);
  });

  it('returns 0 for every comparison when the key order is empty', () => {
    const compare = sortKeys([]);
    expect(compare('a', 'b')).toBe(0);
    expect(compare('b', 'a')).toBe(0);
  });

  it('is a no-op comparator when there are no items to sort', () => {
    const items: string[] = [];
    expect([...items].sort(sortKeys(['a', 'b']))).toEqual([]);
  });
});
