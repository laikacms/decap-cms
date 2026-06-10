import {
  authenticating,
  authenticate,
  authError,
  doneAuthenticating,
  useOpenAuthoring,
  logout,
  AUTH_REQUEST,
  AUTH_SUCCESS,
  AUTH_FAILURE,
  AUTH_REQUEST_DONE,
  USE_OPEN_AUTHORING,
  LOGOUT,
} from '../auth';

describe('auth action creators', () => {
  it('authenticating() returns AUTH_REQUEST action', () => {
    expect(authenticating()).toEqual({ type: AUTH_REQUEST });
  });

  it('authenticate(userData) returns AUTH_SUCCESS action with payload', () => {
    const userData = { name: 'alice', token: 'tok-123' };
    expect(authenticate(userData)).toEqual({ type: AUTH_SUCCESS, payload: userData });
  });

  it('authError(error) returns AUTH_FAILURE action with error payload', () => {
    const error = new Error('Bad credentials');
    const action = authError(error);
    expect(action.type).toBe(AUTH_FAILURE);
    expect(action.payload).toBe(error);
    expect(action.error).toBeTruthy();
  });

  it('doneAuthenticating() returns AUTH_REQUEST_DONE action', () => {
    expect(doneAuthenticating()).toEqual({ type: AUTH_REQUEST_DONE });
  });

  it('useOpenAuthoring() returns USE_OPEN_AUTHORING action', () => {
    expect(useOpenAuthoring()).toEqual({ type: USE_OPEN_AUTHORING });
  });

  it('logout() returns LOGOUT action', () => {
    expect(logout()).toEqual({ type: LOGOUT });
  });
});
