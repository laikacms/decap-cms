import { useDispatch, useSelector } from 'react-redux';

import type { TypedUseSelectorHook } from 'react-redux';
import type { ThunkDispatch, ThunkAction } from 'redux-thunk';
import type { AnyAction, Dispatch } from 'redux';
import type { State } from 'decap-cms-lib-util/types/cms-immutable';

// Re-export types for convenience
export type RootState = State;

// eslint-disable-next-line @typescript-eslint/ban-types
type ThunkExtraArg = {};

// AppDispatch that can handle both regular actions and thunk actions
export type AppDispatch = ThunkDispatch<State, ThunkExtraArg, AnyAction> & Dispatch<AnyAction>;

// Type for thunk actions used in the app
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, State, ThunkExtraArg, AnyAction>;

/**
 * Typed dispatch hook for use throughout the app
 * Returns a dispatch function that can handle thunk actions
 *
 * Note: We use a type assertion here because react-redux's useDispatch
 * has overloads that use `unknown` as the extra argument, but our thunk
 * actions use `{}`. This is safe because {} is assignable to unknown.
 */
export function useAppDispatch() {
  const dispatch = useDispatch();
  // Return a dispatch that accepts any action or thunk
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return dispatch as <T>(action: T) => T extends (...args: any[]) => infer R ? R : T;
}

/**
 * Typed selector hook for use throughout the app
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
