import { useCallback } from 'react';

import { loginUser, logoutUser } from '@/core/actions/auth';
import { useAppDispatch, useAppSelector } from './useRedux';

import type { CmsCredentials as Credentials } from '@/lib/util/index';

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
