import { describe, expect, it } from 'vitest';

import { authenticateUser, loginUser, logoutUser, sessionExpired } from '@/core/actions/auth';
import auth, { defaultState } from '@/core/reducers/auth';

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
});
