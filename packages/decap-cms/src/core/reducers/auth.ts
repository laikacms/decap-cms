import { createAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { addNotification, clearNotifications } from '@/core/actions/notifications';
import { currentBackend } from '@/core/backend';
import { ACCESS_TOKEN_ERROR } from '@/lib/util/index';
import queryCore from '@/lib/util/queryCore';

import type { CmsCredentials, CmsUser as User } from '@/lib/util/index';

type State = any;

// This is an RTK "slice file": the thunks live next to the slice because the
// slice needs their lifecycle action creators *eagerly* (at module
// evaluation) while the thunks only need their own imports (`currentBackend`
// et al.) lazily, at dispatch time. Splitting them across actions/ and
// reducers/ made the slice read `logoutUser.pending` mid-import-cycle, where
// it is still undefined. `@/core/actions/auth` re-exports the action
// creators, so consumers keep importing from the conventional path.

export const useOpenAuthoring = createAction('auth/useOpenAuthoring');

/**
 * The backend reported that the session ended outside a user action (e.g. an
 * expired access token whose refresh grant was rejected). Unlike `logoutUser`
 * this keeps the store's user (and therefore any mounted editor with unsaved
 * work) intact; the app renders a blocking re-auth overlay instead of
 * swapping to the login screen.
 */
export const sessionExpired = createAction('auth/sessionExpired');

// Check if user data token is cached and is valid
export const authenticateUser = createAsyncThunk<User | null, void, { state: State }>(
  'auth/authenticateUser',
  async (_, { dispatch, getState }) => {
    const backend = currentBackend(getState().config);
    try {
      const user = await backend.currentUser();
      if (user && user.useOpenAuthoring) {
        dispatch(useOpenAuthoring());
      }
      return user || null;
    } catch (error) {
      // Only a definitive auth failure (the backend says the session is dead)
      // may destroy the stored session. Transient failures - offline boot, a
      // token endpoint hiccup - keep the stored tokens so a reload or retry
      // can restore the session without re-authenticating.
      if ((error as Error).name === ACCESS_TOKEN_ERROR) {
        dispatch(logoutUser());
      }
      throw error;
    }
  },
);

export const loginUser = createAsyncThunk<User, CmsCredentials, { state: State }>(
  'auth/loginUser',
  async (credentials, { dispatch, getState }) => {
    const backend = currentBackend(getState().config);
    try {
      const user = await backend.authenticate(credentials);
      if (user.useOpenAuthoring) {
        dispatch(useOpenAuthoring());
      }
      return user;
    } catch (error) {
      console.error(error);
      dispatch(
        addNotification({
          message: {
            details: (error as Error).message,
            key: 'ui.toast.onFailToAuth',
          },
          type: 'error',
          dismissAfter: 8000,
        }),
      );
      throw error;
    }
  },
);

export const logoutUser = createAsyncThunk<void, void, { state: State }>(
  'auth/logoutUser',
  async (_, { dispatch, getState }) => {
    const backend = currentBackend(getState().config);
    await backend.logout();
    queryCore.clear();
    dispatch(clearNotifications());
  },
);

export type Auth = {
  isFetching: boolean,
  user: User | undefined,
  error: string | undefined,
  /**
   * True when the backend reported unrecoverable session expiry while a user
   * was logged in. `user` is intentionally kept so the app tree (and any
   * editor with unsaved work) stays mounted behind the re-auth overlay.
   */
  sessionExpired: boolean,
};

export const defaultState: Auth = {
  isFetching: false,
  user: undefined,
  error: undefined,
  sessionExpired: false,
};

const auth = createSlice({
  name: 'auth',
  initialState: defaultState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(sessionExpired, state => {
        state.sessionExpired = true;
      })
      .addCase(authenticateUser.pending, state => {
        state.isFetching = true;
      })
      .addCase(authenticateUser.fulfilled, (state, action) => {
        state.isFetching = false;
        if (action.payload) {
          state.user = action.payload;
          state.sessionExpired = false;
          state.error = undefined;
        }
      })
      .addCase(authenticateUser.rejected, (state, action) => {
        state.isFetching = false;
        state.error = action.error.message;
      })
      .addCase(loginUser.pending, state => {
        state.isFetching = true;
        state.error = undefined;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isFetching = false;
        state.user = action.payload;
        state.sessionExpired = false;
        state.error = undefined;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isFetching = false;
        state.error = action.error.message;
      })
      // The user is cleared on `pending` rather than `fulfilled` so an
      // explicit logout swaps to the login screen immediately, even when the
      // backend's remote logout call is slow or fails.
      .addCase(logoutUser.pending, state => {
        state.user = undefined;
        state.isFetching = false;
        state.sessionExpired = false;
      });
  },
});

export default auth.reducer;
