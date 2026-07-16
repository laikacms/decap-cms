// Based on wait-service by Mozilla:
// https://github.com/mozilla/gecko-dev/blob/master/devtools/client/shared/redux/middleware/wait-service.js

/**
 * A middleware that provides the ability for actions to install a
 * function to be run once when a specific condition is met by an
 * action coming through the system. Think of it as a thunk that
 * blocks until the condition is met.
 */
import type { AnyAction, Dispatch, MiddlewareAPI } from 'redux';

type State = any;

export const WAIT_UNTIL_ACTION = 'WAIT_UNTIL_ACTION';

export interface WaitActionArgs {
  predicate: (action: AnyAction) => boolean;
  run: (dispatch: Dispatch, getState: () => State, action: AnyAction) => void;
}

interface WaitAction extends WaitActionArgs {
  type: typeof WAIT_UNTIL_ACTION;
}

export const waitUntilAction = (api: MiddlewareAPI<Dispatch, State>) => {
  const { dispatch, getState } = api;
  let pending: WaitAction[] = [];

  function checkPending(action: AnyAction): void {
    const readyRequests: WaitAction[] = [];
    const stillPending: WaitAction[] = [];

    // Find the pending requests whose predicates are satisfied with
    // this action. Wait to run the requests until after we update the
    // pending queue because the request handler may synchronously
    // dispatch again and run this service (that use case is
    // completely valid).
    for (const request of pending) {
      if (request.predicate(action)) {
        readyRequests.push(request);
      } else {
        stillPending.push(request);
      }
    }

    pending = stillPending;
    for (const request of readyRequests) {
      request.run(dispatch, getState, action);
    }
  }

  return (next: Dispatch<AnyAction>) => (action: unknown): unknown => {
    const typedAction = action as AnyAction;
    if (typedAction.type === WAIT_UNTIL_ACTION) {
      pending.push(typedAction as WaitAction);
      return null;
    }
    const result = next(typedAction);
    checkPending(typedAction);
    return result;
  };
};
