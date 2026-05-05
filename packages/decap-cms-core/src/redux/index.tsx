import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { thunk as thunkMiddleware } from 'redux-thunk';

import { waitUntilAction } from './middleware/waitUntilAction';
import createRootReducer from '../reducers/combinedReducer';

import type { ThunkDispatch } from 'redux-thunk';
import type { AnyAction, Reducer, Middleware } from 'redux';

const store = createStore<any | undefined, AnyAction, object, object>(
  createRootReducer() as unknown as Reducer<any | undefined, AnyAction>,
  composeWithDevTools(
    applyMiddleware(
      thunkMiddleware as unknown as Middleware,
      waitUntilAction as unknown as Middleware,
    ),
  ),
);

// Export types for typed hooks
export type RootState = any;
// Using {} for extra argument to match existing thunk actions
export type AppDispatch = ThunkDispatch<any, {}, AnyAction>;

export { store };
