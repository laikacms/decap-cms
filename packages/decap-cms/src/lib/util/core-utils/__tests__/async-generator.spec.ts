import { describe, expect, it } from 'vitest';

import { first, toArray } from '@/lib/util/core-utils/async-generator.js';

async function* emptyGen(): AsyncGenerator<number> {}

async function* multiItemGen(): AsyncGenerator<number> {
  yield 1;
  yield 2;
  yield 3;
}

describe('toArray', () => {
  it('should return an empty array for an empty generator', async () => {
    expect(await toArray(emptyGen())).toEqual([]);
  });

  it('should collect all items yielded by a multi-item generator', async () => {
    expect(await toArray(multiItemGen())).toEqual([1, 2, 3]);
  });
});

describe('first', () => {
  it('should return undefined for an empty generator', async () => {
    expect(await first(emptyGen())).toBeUndefined();
  });

  it('should return the first item of a non-empty generator', async () => {
    expect(await first(multiItemGen())).toBe(1);
  });

  it('should close the generator after reading the first item, per for-await-of semantics', async () => {
    const gen = multiItemGen();

    expect(await first(gen)).toBe(1);
    // The underlying `for await...of` loop's early `return` calls the generator's
    // `return()` method, closing it rather than leaving items 2 and 3 pending.
    expect(await gen.next()).toEqual({ value: undefined, done: true });
  });
});
