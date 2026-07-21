import { describe, expect, it } from 'vitest';

import { getNestedValue } from '@/lib/util/core-utils/get-nested-value.js';

describe('getNestedValue', () => {
  it('should look up a nested object value by path', () => {
    expect(getNestedValue({ a: { b: { c: 1 } } }, ['a', 'b', 'c'])).toBe(1);
  });

  it('should return the object itself for an empty path', () => {
    const obj = { a: 1 };
    expect(getNestedValue(obj, [])).toBe(obj);
  });

  it('should look up array values by numeric-string index', () => {
    expect(getNestedValue({ a: [10, 20, 30] }, ['a', '1'])).toBe(20);
  });

  it('should return undefined when an intermediate value is null', () => {
    expect(getNestedValue({ a: null }, ['a', 'b'])).toBeUndefined();
  });

  it('should return undefined when an intermediate value is undefined', () => {
    expect(getNestedValue({}, ['a', 'b', 'c'])).toBeUndefined();
  });

  it('should return undefined when the root object is null or undefined', () => {
    expect(getNestedValue(null, ['a'])).toBeUndefined();
    expect(getNestedValue(undefined, ['a'])).toBeUndefined();
  });

  it('should preserve falsy-but-defined leaf values', () => {
    expect(getNestedValue({ a: 0 }, ['a'])).toBe(0);
    expect(getNestedValue({ a: '' }, ['a'])).toBe('');
    expect(getNestedValue({ a: false }, ['a'])).toBe(false);
  });
});
