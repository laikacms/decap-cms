import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunkMiddleware from 'redux-thunk';

import { waitUntilAction } from './middleware/waitUntilAction';
import createRootReducer from '../reducers/combinedReducer';

import type { ThunkMiddleware, ThunkDispatch } from 'redux-thunk';
import type { AnyAction } from 'redux';
import type { State } from '../types/cms';
import type { Reducer } from 'react';

const store = createStore<State | undefined, AnyAction, unknown, unknown>(
  createRootReducer() as unknown as Reducer<State | undefined, AnyAction>,
  composeWithDevTools(applyMiddleware(thunkMiddleware as ThunkMiddleware<State>, waitUntilAction)),
);

// Export types for typed hooks
export type RootState = State;
// Using {} for extra argument to match existing thunk actions
// eslint-disable-next-line @typescript-eslint/ban-types
export type AppDispatch = ThunkDispatch<State, {}, AnyAction>;

export { store };
