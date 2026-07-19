import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitUntilWithTimeout } from '@/core/actions/waitUntil';

import type { WaitActionArgs } from '@/core/redux/middleware/waitUntilAction';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

type State = any;

describe('waitUntilWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with a value once the predicate succeeds before the timeout', async () => {
    const dispatch = vi.fn((action: AnyAction) => {
      if (action.type === 'WAIT_UNTIL_ACTION') {
        // Simulate the waitUntilAction middleware immediately satisfying the
        // predicate and running the action's callback.
        action.run(vi.fn(), vi.fn(), { type: 'SOME_ACTION' });
      }
      return action;
    }) as unknown as ThunkDispatch<State, {}, AnyAction>;

    const waitActionArgs = (resolve: (value?: string) => void): WaitActionArgs => ({
      predicate: () => true,
      run: () => resolve('done'),
    });

    const resultPromise = waitUntilWithTimeout(dispatch, waitActionArgs, 30000);

    const result = await resultPromise;

    expect(result).toBe('done');
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('resolves to null when the timeout elapses before the predicate succeeds', async () => {
    const dispatch = vi.fn() as unknown as ThunkDispatch<State, {}, AnyAction>;

    const waitActionArgs = (): WaitActionArgs => ({
      predicate: () => false,
      run: () => {
        // Never resolves; the predicate is never satisfied.
      },
    });

    const resultPromise = waitUntilWithTimeout(dispatch, waitActionArgs, 1000);

    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result).toBeNull();
  });
});
