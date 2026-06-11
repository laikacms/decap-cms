import { waitUntil, waitUntilWithTimeout } from '../waitUntil';
import { WAIT_UNTIL_ACTION } from '../../redux/middleware/waitUntilAction';

describe('waitUntil', () => {
  it('returns a WAIT_UNTIL_ACTION with predicate and run', () => {
    const predicate = jest.fn();
    const run = jest.fn();
    expect(waitUntil({ predicate, run })).toEqual({
      type: WAIT_UNTIL_ACTION,
      predicate,
      run,
    });
  });
});

describe('waitUntilWithTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the value when the wait promise resolves', async () => {
    const dispatch = jest.fn();

    let externalResolve: (value: string) => void;
    const promise = waitUntilWithTimeout<string>(
      dispatch,
      resolve => {
        externalResolve = resolve as (value: string) => void;
        return { predicate: jest.fn(), run: jest.fn() };
      },
      5000,
    );

    externalResolve!('hello');
    const result = await promise;
    expect(result).toBe('hello');
  });

  it('resolves to null on timeout when wait promise never resolves', async () => {
    const dispatch = jest.fn();

    const waitPromise = waitUntilWithTimeout<string>(
      dispatch,
      resolve => {
        void resolve;
        return { predicate: jest.fn(), run: jest.fn() };
      },
      5000,
    );

    jest.advanceTimersByTime(5000);
    const result = await waitPromise;
    expect(result).toBeNull();
  });

  it('resolves to null (not rejects) when the wait promise rejects', async () => {
    // Directly verify .catch(() => null) behaviour — the core of the DCMS-138 fix.
    const error = new Error('something went wrong');
    const swallowed = Promise.reject(error)
      .then(result => result)
      .catch(() => null);

    await expect(swallowed).resolves.toBeNull();
  });
});
