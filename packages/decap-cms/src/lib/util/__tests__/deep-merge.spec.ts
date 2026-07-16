import { describe, expect, it } from 'vitest';

import { deepMerge } from '@/lib/util/core-utils/deep-merge.js';

describe('deepMerge', () => {
  it('should merge nested plain objects recursively with source winning', () => {
    const target = { backend: { name: 'github', branch: 'main' }, media_folder: 'static' };
    const source = { backend: { branch: 'develop' } };

    expect(deepMerge(target, source)).toEqual({
      backend: { name: 'github', branch: 'develop' },
      media_folder: 'static',
    });
  });

  it('should concatenate arrays, target items first', () => {
    const target = { collections: [{ name: 'posts' }] };
    const source = { collections: [{ name: 'pages' }] };

    expect(deepMerge(target, source)).toEqual({
      collections: [{ name: 'posts' }, { name: 'pages' }],
    });
  });

  it('should concatenate top-level arrays', () => {
    expect(deepMerge([1, 2], [3])).toEqual([1, 2, 3]);
  });

  it('should replace when target and source types differ', () => {
    expect(deepMerge({ a: [1] }, { a: { b: 2 } })).toEqual({ a: { b: 2 } });
    expect(deepMerge({ a: { b: 2 } }, { a: [1] })).toEqual({ a: [1] });
    expect(deepMerge({ a: 1 }, { a: { b: 2 } })).toEqual({ a: { b: 2 } });
  });

  it('should let an explicit undefined in the source override the target', () => {
    const result = deepMerge({ a: 1, b: 2 }, { a: undefined });
    expect(result).toEqual({ a: undefined, b: 2 });
    expect('a' in result).toBe(true);
    expect(result.a).toBeUndefined();
  });

  it('should keep target keys missing from the source', () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
  });

  it('should take non-plain values from the source by reference', () => {
    const date = new Date(0);
    const regexp = /x/;
    class Custom {
      value = 1;
    }
    const custom = new Custom();
    const fn = () => 'called';

    const result = deepMerge(
      { a: new Date(1), b: /y/, c: { value: 2 }, d: 'kept' },
      { a: date, b: regexp, c: custom, d: fn },
    );

    expect(result.a).toBe(date);
    expect(result.b).toBe(regexp);
    expect(result.c).toBe(custom);
    expect(result.d).toBe(fn);
  });

  it('should not mutate its inputs', () => {
    const target = { i18n: { locales: ['en'] }, backend: { name: 'github' } };
    const source = { i18n: { locales: ['de'] } };

    deepMerge(target, source);

    expect(target).toEqual({ i18n: { locales: ['en'] }, backend: { name: 'github' } });
    expect(source).toEqual({ i18n: { locales: ['de'] } });
  });

  it('should not share plain object or array references with its inputs', () => {
    const target = { backend: { name: 'github' }, collections: [{ name: 'posts' }] };
    const source = { extra: { nested: { flag: true } } };

    const result = deepMerge(target, source);

    expect(result.backend).not.toBe(target.backend);
    expect(result.collections).not.toBe(target.collections);
    expect(result.collections[0]).not.toBe(target.collections[0]);
    expect(result.extra).not.toBe(source.extra);
    expect(result.extra.nested).not.toBe(source.extra.nested);
  });

  it('should ignore prototype pollution attempts', () => {
    const source = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"x": 1}}');

    const result = deepMerge({ safe: 1 }, source) as Record<string, unknown>;

    expect(result).toEqual({ safe: 1 });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
