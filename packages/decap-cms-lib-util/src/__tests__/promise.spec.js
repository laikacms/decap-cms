import { then, onlySuccessfulPromises, flowAsync } from '../promise';

describe('onlySuccessfulPromises', () => {
  it('returns all values when all promises resolve', async () => {
    const promises = [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)];
    const result = await onlySuccessfulPromises(promises);
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns only resolved values when some promises reject', async () => {
    const promises = [Promise.resolve(1), Promise.reject(new Error('fail')), Promise.resolve(3)];
    const result = await onlySuccessfulPromises(promises);
    expect(result).toEqual([1, 3]);
  });

  it('returns empty array when all promises reject', async () => {
    const promises = [Promise.reject(new Error('a')), Promise.reject(new Error('b'))];
    const result = await onlySuccessfulPromises(promises);
    expect(result).toEqual([]);
  });
});

describe('flowAsync', () => {
  it('passes value through a single async function', async () => {
    async function double(x) {
      return x * 2;
    }
    const pipeline = flowAsync([double]);
    const result = await pipeline(5);
    expect(result).toBe(10);
  });

  it('composes two async functions left-to-right', async () => {
    async function double(x) {
      return x * 2;
    }
    async function addOne(x) {
      return x + 1;
    }
    const pipeline = flowAsync([double, addOne]);
    const result = await pipeline(3);
    expect(result).toBe(7);
  });
});

describe('then', () => {
  it('returns a function that applies fn to a resolved promise value', async () => {
    function double(x) {
      return x * 2;
    }
    const result = await then(double)(Promise.resolve(4));
    expect(result).toBe(8);
  });
});
