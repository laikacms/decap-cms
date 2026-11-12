import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

import {
  authenticateUser,
  authError,
  loginUser,
  logoutUser,
  sessionExpired,
  sessionInvalidated,
} from '@/core/actions/auth';
import { CONFIG_SUCCESS } from '@/core/actions/config';
import { NOTIFICATION_SEND } from '@/core/actions/notifications';
import { currentBackend } from '@/core/backend';
import auth, { defaultState } from '@/core/reducers/auth';

vi.mock('@/core/backend', () => ({
  currentBackend: vi.fn(),
}));

const credentials = { token: 'token' };

describe('auth', () => {
  it('should handle an empty state', () => {
    expect(auth(undefined, { type: 'unknown' })).toEqual(defaultState);
  });

  it('should handle an authentication request', () => {
    expect(auth(undefined, loginUser.pending('req', credentials))).toEqual({
      ...defaultState,
      isFetching: true,
    });
  });

  it('should handle authentication', () => {
    const user = { name: 'joe', token: 'token' };
    expect(auth(undefined, loginUser.fulfilled(user, 'req', credentials))).toEqual({
      ...defaultState,
      user,
    });
  });

  it('should handle an authentication error', () => {
    expect(auth(undefined, loginUser.rejected(new Error('Bad credentials'), 'req', credentials))).toEqual({
      ...defaultState,
      error: 'Bad credentials',
    });
  });

  it('should handle logout', () => {
    const user = { name: 'joe', token: 'token' };
    const newState = auth({ ...defaultState, user }, logoutUser.pending('req'));
    expect(newState.user).toBeUndefined();
  });

  it('should flag session expiry without dropping the user', () => {
    const user = { name: 'joe', token: 'token' };
    const newState = auth({ ...defaultState, user }, sessionExpired());
    expect(newState.sessionExpired).toBe(true);
    expect(newState.user).toEqual(user);
  });

  it('should clear the session expired flag on re-login', () => {
    const user = { name: 'joe', token: 'token' };
    const expired = { ...defaultState, user, sessionExpired: true };
    expect(auth(expired, loginUser.fulfilled(user, 'req', credentials)).sessionExpired).toBe(false);
  });

  it('should keep the user on a restore that finds no session', () => {
    const newState = auth(undefined, authenticateUser.fulfilled(null, 'req'));
    expect(newState).toEqual(defaultState);
  });

  describe('loginUser thunk notification behaviour', () => {
    function makeStore() {
      const dispatched: unknown[] = [];
      const captureMiddleware = () => (next: (action: unknown) => unknown) => (action: unknown) => {
        dispatched.push(action);
        return next(action);
      };
      const store = configureStore({
        reducer: { auth, config: () => ({}) },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
      });
      return { store, dispatched };
    }

    it('does not dispatch an error toast when the backend rejects with an AbortError (user cancelled the picker)', async () => {
      const abortError = new DOMException('The user aborted a request.', 'AbortError');
      vi.mocked(currentBackend).mockReturnValue({
        authenticate: vi.fn().mockRejectedValue(abortError),
      } as never);

      const { store, dispatched } = makeStore();

      await expect(store.dispatch(loginUser(credentials) as never).unwrap()).rejects.toThrow();

      expect(dispatched.some(action => (action as { type: string }).type === NOTIFICATION_SEND)).toBe(
        false,
      );
      expect(store.getState().auth.error).toMatch(/aborted/i);
    });

    it('still dispatches an error toast for non-abort auth failures', async () => {
      vi.mocked(currentBackend).mockReturnValue({
        authenticate: vi.fn().mockRejectedValue(new Error('Permission to access the local folder was not granted.')),
      } as never);

      const { store, dispatched } = makeStore();

      await expect(store.dispatch(loginUser(credentials) as never).unwrap()).rejects.toThrow();

      const notification = dispatched.find(
        action => (action as { type: string }).type === NOTIFICATION_SEND,
      ) as { payload: { message: { details: string } } } | undefined;
      expect(notification).toBeDefined();
      expect(notification!.payload.message.details).toMatch(/not granted/);
    });
  });

  describe('backend permissions', () => {
    function makeStore(config: Record<string, unknown>) {
      const dispatched: { type: string, payload?: any }[] = [];
      const captureMiddleware = () => (next: (action: unknown) => unknown) => (action: unknown) => {
        dispatched.push(action as { type: string });
        return next(action);
      };
      const store = configureStore({
        reducer: { auth, config: (state = config) => state },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
      });
      return { store, dispatched };
    }
    const config = { collections: [{ name: 'posts' }, { name: 'pages' }] };

    it('re-filters the config against the permissions a login resolves', async () => {
      vi.mocked(currentBackend).mockReturnValue({
        authenticate: vi.fn().mockResolvedValue({
          name: 'joe',
          token: 'token',
          permissions: { collections: { pages: 'none' } },
        }),
      } as never);
      const { store, dispatched } = makeStore(config);

      await store.dispatch(loginUser(credentials) as never);

      const success = dispatched.find(action => action.type === CONFIG_SUCCESS);
      expect(success?.payload.collections).toEqual([{ name: 'posts' }]);
    });

    it('re-filters on a restored session too', async () => {
      vi.mocked(currentBackend).mockReturnValue({
        currentUser: vi.fn().mockResolvedValue({
          name: 'joe',
          token: 'token',
          permissions: { collections: { posts: 'view' } },
        }),
      } as never);
      const { store, dispatched } = makeStore(config);

      await store.dispatch(authenticateUser() as never);

      const success = dispatched.find(action => action.type === CONFIG_SUCCESS);
      expect(success?.payload.collections[0]).toEqual({
        name: 'posts',
        create: false,
        delete: false,
        publish: false,
      });
    });

    it('leaves the config alone for a user without permissions', async () => {
      vi.mocked(currentBackend).mockReturnValue({
        authenticate: vi.fn().mockResolvedValue({ name: 'joe', token: 'token' }),
      } as never);
      const { store, dispatched } = makeStore(config);

      await store.dispatch(loginUser(credentials) as never);

      expect(dispatched.some(action => action.type === CONFIG_SUCCESS)).toBe(false);
    });
  });

  describe('sessionInvalidated', () => {
    it('sets the reason as the auth error', () => {
      expect(auth(undefined, authError('Gone')).error).toBe('Gone');
    });

    it('shows the reason and logs out once a user is logged in', async () => {
      const logout = vi.fn().mockResolvedValue(undefined);
      vi.mocked(currentBackend).mockReturnValue({ logout } as never);
      const user = { name: 'joe', token: 'token' };
      const store = configureStore({
        reducer: { auth, config: () => ({}) },
        preloadedState: { auth: { ...defaultState, user }, config: {} },
      });

      store.dispatch(sessionInvalidated('Session expired. Please log in again.') as never);
      await vi.waitFor(() => expect(logout).toHaveBeenCalledTimes(1));

      expect(store.getState().auth.user).toBeUndefined();
      expect(store.getState().auth.error).toBe('Session expired. Please log in again.');

      // A second report finds nobody logged in and does nothing.
      store.dispatch(sessionInvalidated('again') as never);
      expect(logout).toHaveBeenCalledTimes(1);
      expect(store.getState().auth.error).toBe('Session expired. Please log in again.');
    });
  });
});
