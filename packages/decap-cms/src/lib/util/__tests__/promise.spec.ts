import { describe, expect, it } from 'vitest';

import { flowAsync, onlySuccessfulPromises, thenP } from '@/lib/util/promise';

describe('thenP', () => {
  it('resolves and maps the value through the mapping fn', async () => {
    const double = thenP((n: number) => n * 2);

    await expect(double(Promise.resolve(21))).resolves.toEqual(42);
  });

  it('passes through rejection without catching it', async () => {
    const double = thenP((n: number) => n * 2);
    const error = new Error('boom');

    await expect(double(Promise.reject(error))).rejects.toBe(error);
  });
});

describe('onlySuccessfulPromises', () => {
  it('returns all values when every promise resolves', async () => {
    const result = await onlySuccessfulPromises([
      Promise.resolve('a'),
      Promise.resolve('b'),
      Promise.resolve('c'),
    ]);

    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty array when every promise rejects', async () => {
    const result = await onlySuccessfulPromises([
      Promise.reject(new Error('one')),
      Promise.reject(new Error('two')),
    ]);

    expect(result).toEqual([]);
  });

  it('drops rejections and preserves the order of the successful ones', async () => {
    const result = await onlySuccessfulPromises([
      Promise.resolve('first'),
      Promise.reject(new Error('dropped')),
      Promise.resolve('second'),
      Promise.reject(new Error('also dropped')),
      Promise.resolve('third'),
    ]);

    expect(result).toEqual(['first', 'second', 'third']);
  });

  it('resolves to an empty array when given an empty array', async () => {
    const result = await onlySuccessfulPromises([]);

    expect(result).toEqual([]);
  });
});

describe('flowAsync', () => {
  it('returns a function that resolves to the input when given a single passthrough fn', async () => {
    const identity = flowAsync([(n: number) => n]);

    await expect(identity(5)).resolves.toEqual(5);
  });

  it('chains multiple sync functions left-to-right', async () => {
    const addOneThenDouble = flowAsync([(n: number) => n + 1, (n: number) => n * 2]);

    await expect(addOneThenDouble(3)).resolves.toEqual(8);
  });

  it('chains a mix of sync and async functions, awaiting each intermediate result', async () => {
    const order: string[] = [];

    const asyncAddOne = async (n: number) => {
      order.push('asyncAddOne');
      return n + 1;
    };
    const syncDouble = (n: number) => {
      order.push('syncDouble');
      return n * 2;
    };
    const asyncStringify = async (n: number) => {
      order.push('asyncStringify');
      return `result:${n}`;
    };

    const composed = flowAsync([asyncAddOne, syncDouble, asyncStringify]);

    await expect(composed(4)).resolves.toEqual('result:10');
    expect(order).toEqual(['asyncAddOne', 'syncDouble', 'asyncStringify']);
  });

  it('returns the input value unchanged when given an empty array', () => {
    const noop = flowAsync([]);

    expect(noop(9)).toEqual(9);
  });
});
