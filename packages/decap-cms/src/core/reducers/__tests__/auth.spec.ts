import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

import { authenticateUser, loginUser, logoutUser, sessionExpired } from '@/core/actions/auth';
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
});
