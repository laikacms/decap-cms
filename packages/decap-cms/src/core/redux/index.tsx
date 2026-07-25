import { configureStore } from '@reduxjs/toolkit';

import createRootReducer from '@/core/reducers/combinedReducer';
import { createCrossTabSyncMiddleware } from './middleware/crossTabSync';
import { sessionListener } from './middleware/sessionListener';
import { waitUntilAction } from './middleware/waitUntilAction';

import type { AnyAction, Middleware, Reducer } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

type State = any;

const store = configureStore({
  // Cast keeps the store's state typed `any`, matching the exported
  // `RootState`; the reducer slices are not yet accurately typed enough for
  // an inferred root state to be usable.
  reducer: createRootReducer() as unknown as Reducer<State, AnyAction>,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // The legacy state tree holds non-serializable values (File/blob
      // handles on media entries, cursor instances) and is written to by
      // code that predates RTK; the dev-mode invariant checks would drown
      // the console in false positives.
      serializableCheck: false,
      immutableCheck: false,
    })
      // Listeners run before reducers so `condition()` predicates see every
      // action, including ones the wait-service middleware would swallow.
      .prepend(sessionListener.middleware)
      .concat(waitUntilAction as unknown as Middleware)
      // Mirrors durable data mutations and auth session events to other tabs
      // over a BroadcastChannel (no-op where unsupported).
      .concat(createCrossTabSyncMiddleware()),
});

// Export types for typed hooks
export type RootState = State;
// Using {} for extra argument to match existing thunk actions
export type AppDispatch = ThunkDispatch<State, {}, AnyAction>;

export { store };
