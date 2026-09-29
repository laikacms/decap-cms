import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { combineReducers, legacy_createStore as createStore, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import authReducer, { defaultState } from '@/core/reducers/auth';
import { currentBackend } from '@/core/backend';
import { useAuth } from '@/core/hooks/useAuth';

import type { Auth } from '@/core/reducers/auth';
import type { CmsUser } from '@/lib/util/index';

vi.mock('@/core/backend', () => ({ currentBackend: vi.fn() }));

const user = { login: 'jane', name: 'Jane' } as unknown as CmsUser;

const backend = {
  authenticate: vi.fn(),
  logout: vi.fn(),
};

function setup(auth: Partial<Auth> = {}) {
  const reducer = combineReducers({
    auth: authReducer,
    config: (state: unknown = {}) => state,
    notifications: (state: unknown = {}) => state,
  });
  const store = createStore(
    reducer,
    { auth: { ...defaultState, ...auth }, config: {}, notifications: {} } as never,
    applyMiddleware(thunk),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...renderHook(() => useAuth(), { wrapper }) };
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backend.authenticate.mockResolvedValue(user);
    backend.logout.mockResolvedValue(undefined);
    vi.mocked(currentBackend).mockReturnValue(backend as never);
  });

  it('reports unauthenticated state by default', () => {
    const { result } = setup();

    expect(result.current.user).toBeUndefined();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAuthenticating).toBe(false);
    expect(result.current.authError).toBeUndefined();
  });

  it('reports authenticated state when the store holds a user', () => {
    const { result } = setup({ user });

    expect(result.current.user).toBe(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('exposes isFetching as isAuthenticating and passes authError through', () => {
    const { result } = setup({ isFetching: true, error: 'bad credentials' });

    expect(result.current.isAuthenticating).toBe(true);
    expect(result.current.authError).toBe('bad credentials');
  });

  it('login(credentials) runs loginUser and authenticates the user', async () => {
    const { result } = setup();
    const credentials = { token: 'abc' } as never;

    act(() => result.current.login(credentials));

    expect(result.current.isAuthenticating).toBe(true);
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(backend.authenticate).toHaveBeenCalledWith(credentials);
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticating).toBe(false);
  });

  it('login surfaces backend failures as authError', async () => {
    backend.authenticate.mockRejectedValue(new Error('nope'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = setup();

    act(() => result.current.login({} as never));

    await waitFor(() => expect(result.current.authError).toBe('nope'));
    expect(result.current.isAuthenticated).toBe(false);
    consoleError.mockRestore();
  });

  it('logout() runs logoutUser and clears the user', async () => {
    const { result } = setup({ user });

    act(() => result.current.logout());

    await waitFor(() => expect(backend.logout).toHaveBeenCalledTimes(1));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('keeps login and logout referentially stable across rerenders', () => {
    const { result, rerender } = setup();
    const { login, logout } = result.current;

    rerender();

    expect(result.current.login).toBe(login);
    expect(result.current.logout).toBe(logout);
  });
});
