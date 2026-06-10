import { waitUntilAction, WAIT_UNTIL_ACTION } from '../waitUntilAction';

import type { Dispatch, AnyAction, MiddlewareAPI } from 'redux';
import type { State } from '../../../types/redux';

function createMiddlewareChain() {
  const dispatch = jest.fn<AnyAction, [AnyAction]>(action => action);
  const getState = jest.fn(() => ({} as State));
  const api: MiddlewareAPI<Dispatch, State> = { dispatch, getState };
  const next = jest.fn<AnyAction, [AnyAction]>(action => action);
  const handler = waitUntilAction(api)(next);
  return { dispatch, getState, next, handler };
}

describe('waitUntilAction middleware', () => {
  it('consumes WAIT_UNTIL_ACTION and adds it to the pending queue without calling next', () => {
    const { next, handler } = createMiddlewareChain();
    const predicate = jest.fn(() => false);
    const run = jest.fn();

    const result = handler({ type: WAIT_UNTIL_ACTION, predicate, run });

    expect(result).toBeNull();
    expect(next).not.toHaveBeenCalled();
  });

  it('invokes run with dispatch, getState, and triggering action when predicate returns true', () => {
    const { dispatch, getState, handler } = createMiddlewareChain();
    const triggeringAction = { type: 'SOME_ACTION' };
    const predicate = jest.fn((action: AnyAction) => action.type === 'SOME_ACTION');
    const run = jest.fn();

    handler({ type: WAIT_UNTIL_ACTION, predicate, run });
    handler(triggeringAction);

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(dispatch, getState, triggeringAction);
  });

  it('does not invoke run when predicate returns false', () => {
    const { handler } = createMiddlewareChain();
    const predicate = jest.fn(() => false);
    const run = jest.fn();

    handler({ type: WAIT_UNTIL_ACTION, predicate, run });
    handler({ type: 'UNRELATED_ACTION' });

    expect(run).not.toHaveBeenCalled();
  });

  it('removes a matched pending action from the queue so it does not fire again', () => {
    const { handler } = createMiddlewareChain();
    const predicate = jest.fn(() => true);
    const run = jest.fn();

    handler({ type: WAIT_UNTIL_ACTION, predicate, run });
    handler({ type: 'FIRST_TRIGGER' });
    handler({ type: 'SECOND_TRIGGER' });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('handles multiple pending actions with different predicates independently', () => {
    const { handler } = createMiddlewareChain();
    const runA = jest.fn();
    const runB = jest.fn();

    handler({
      type: WAIT_UNTIL_ACTION,
      predicate: (action: AnyAction) => action.type === 'ACTION_A',
      run: runA,
    });
    handler({
      type: WAIT_UNTIL_ACTION,
      predicate: (action: AnyAction) => action.type === 'ACTION_B',
      run: runB,
    });

    handler({ type: 'ACTION_A' });

    expect(runA).toHaveBeenCalledTimes(1);
    expect(runB).not.toHaveBeenCalled();

    handler({ type: 'ACTION_B' });

    expect(runA).toHaveBeenCalledTimes(1);
    expect(runB).toHaveBeenCalledTimes(1);
  });
});
