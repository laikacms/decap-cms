import { useCallback } from 'react';

import { useAppSelector, useAppDispatch } from './useRedux';
import { loginUser, logoutUser } from '../actions/auth';

import type { CmsCredentials as Credentials } from '../../lib/util/index';

/**
 * Hook for authentication state and actions
 * Replaces connect() mapStateToProps/mapDispatchToProps for auth
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const user = auth.user;

  const login = useCallback(
    (credentials: Credentials) => {
      dispatch(loginUser(credentials));
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    dispatch(logoutUser());
  }, [dispatch]);

  return {
    auth,
    user,
    isAuthenticated: !!user,
    isAuthenticating: auth.isFetching,
    authError: auth.error,
    login,
    logout,
  };
}
