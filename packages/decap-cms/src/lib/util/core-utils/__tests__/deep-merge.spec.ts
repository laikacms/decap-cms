import { describe, expect, it } from 'vitest';

import { deepMerge } from '@/lib/util/core-utils/deep-merge.js';

describe('deepMerge', () => {
  it('should merge plain objects with source keys winning over target keys', () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should merge nested objects recursively', () => {
    const target = { a: { x: 1, y: 2 }, b: 1 };
    const source = { a: { y: 3, z: 4 } };

    expect(deepMerge(target, source)).toEqual({ a: { x: 1, y: 3, z: 4 }, b: 1 });
  });

  it('should concatenate arrays with target items first', () => {
    expect(deepMerge({ a: [1, 2] }, { a: [3, 4] })).toEqual({ a: [1, 2, 3, 4] });
  });

  it('should concatenate top-level arrays passed directly', () => {
    expect(deepMerge([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('should override primitives with the source value', () => {
    expect(deepMerge({ a: 1 }, { a: 'two' })).toEqual({ a: 'two' });
    expect(deepMerge({ a: 'foo' }, { a: undefined })).toEqual({ a: undefined });
  });

  it('should take a non-object/non-array source as-is when target is also not mergeable', () => {
    expect(deepMerge(1, 2)).toBe(2);
    expect(deepMerge('a', 'b')).toBe('b');
  });

  it('should replace an object with an array, or an array with an object, from the source', () => {
    expect(deepMerge({ a: { x: 1 } }, { a: [1, 2] })).toEqual({ a: [1, 2] });
    expect(deepMerge({ a: [1, 2] }, { a: { x: 1 } })).toEqual({ a: { x: 1 } });
  });

  it('should drop __proto__, constructor, and prototype keys from the source', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "constructor": 1, "prototype": 2, "safe": 3}');
    const result = deepMerge({}, malicious) as Record<string, unknown>;

    expect(result).toEqual({ safe: 3 });
    expect(result.polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
  });

  it('should drop unsafe keys from the target as well', () => {
    const maliciousTarget = JSON.parse('{"__proto__": {"polluted": true}, "safe": 1}');
    const result = deepMerge(maliciousTarget, {}) as Record<string, unknown>;

    expect(result).toEqual({ safe: 1 });
    expect(result.polluted).toBeUndefined();
  });

  it('should not mutate the target or source objects', () => {
    const target = { a: { x: 1 }, arr: [1, 2] };
    const source = { a: { y: 2 }, arr: [3, 4] };
    const targetSnapshot = JSON.parse(JSON.stringify(target));
    const sourceSnapshot = JSON.parse(JSON.stringify(source));

    deepMerge(target, source);

    expect(target).toEqual(targetSnapshot);
    expect(source).toEqual(sourceSnapshot);
  });

  it('should not share nested object or array references with the inputs', () => {
    const target = { a: { x: 1 }, arr: [1, 2] };
    const source = { a: { y: 2 }, arr: [3, 4] };

    const result = deepMerge(target, source);

    expect(result.a).not.toBe(target.a);
    expect(result.a).not.toBe(source.a);
    expect(result.arr).not.toBe(target.arr);
    expect(result.arr).not.toBe(source.arr);
  });

  it('should not mutate the result when the original target is later mutated', () => {
    const target = { a: { x: 1 } };
    const result = deepMerge(target, { b: 2 });

    target.a.x = 999;

    expect(result.a.x).toBe(1);
  });
});
