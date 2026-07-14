import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { thunk as thunkMiddleware } from 'redux-thunk';

import { waitUntilAction } from './middleware/waitUntilAction';
import createRootReducer from '@/core/reducers/combinedReducer';

import type { ThunkDispatch } from 'redux-thunk';
import type { AnyAction, Reducer, Middleware } from 'redux';

type State = any;

const store = createStore<State | undefined, AnyAction, object, object>(
  createRootReducer() as unknown as Reducer<State | undefined, AnyAction>,
  composeWithDevTools(
    applyMiddleware(
      thunkMiddleware as unknown as Middleware,
      waitUntilAction as unknown as Middleware,
    ),
  ),
);

// Export types for typed hooks
export type RootState = State;
// Using {} for extra argument to match existing thunk actions
export type AppDispatch = ThunkDispatch<State, {}, AnyAction>;

export { store };
