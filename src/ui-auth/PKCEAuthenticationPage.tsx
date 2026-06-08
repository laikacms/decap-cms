import React from 'react';
import styled from '@emotion/styled';
import { jwtDecode } from 'jwt-decode';

import { PkceAuthenticator } from '../lib-auth/index';
import { AuthenticationPage, Icon } from '../ui-default/index';

import type { PkceAuthResult } from '../lib-auth/index';
import type { JWTClaims, PKCEAuthenticationPageProps, PKCEUser } from './types';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

function normalizeClaimsToUser(
  email_claim: string,
  full_name_claim?: string,
  first_name_claim?: string,
  last_name_claim?: string,
  avatar_url_claim?: string,
): (user: PKCEUser, claims?: JWTClaims) => void {
  return (user: PKCEUser, claims?: JWTClaims) => {
    if (!claims) return;

    if (!user.email && claims[email_claim]) {
      user.email = claims[email_claim] as string;
    }
    if (!user.user_metadata.full_name && full_name_claim && claims[full_name_claim]) {
      user.user_metadata.full_name = claims[full_name_claim] as string;
    }
    if (!user.user_metadata.full_name && (first_name_claim || last_name_claim)) {
      const name: string[] = [];
      if (first_name_claim && claims[first_name_claim])
        name.push(claims[first_name_claim] as string);
      if (last_name_claim && claims[last_name_claim]) name.push(claims[last_name_claim] as string);
      if (name.length) {
        user.user_metadata.full_name = name.join(' ');
      }
    }
    if (!user.user_metadata.avatar_url && avatar_url_claim && claims[avatar_url_claim]) {
      user.user_metadata.avatar_url = claims[avatar_url_claim] as string;
    }
  };
}

/**
 * Hook used by PKCE-based AuthenticationPage components. Sets up a
 * `PkceAuthenticator`, completes the redirect-flow on mount, and exposes a
 * `login` callback plus the current login error.
 */
export function usePkceAuth(
  buildAuth: () => PkceAuthenticator,
  onLogin: (user: PKCEUser) => void,
  options: {
    onCompleteAuth?: (data: PkceAuthResult) => PKCEUser | null;
  } = {},
) {
  const [loginError, setLoginError] = React.useState<string | undefined>();
  const authRef = React.useRef<PkceAuthenticator | null>(null);
  const onLoginRef = React.useRef(onLogin);
  onLoginRef.current = onLogin;
  const onCompleteAuthRef = React.useRef(options.onCompleteAuth);
  onCompleteAuthRef.current = options.onCompleteAuth;

  React.useEffect(() => {
    const auth = buildAuth();
    authRef.current = auth;
    auth.completeAuth((err, data) => {
      if (err) {
        setLoginError(err.toString());
        return;
      }
      if (!data) return;
      const user = onCompleteAuthRef.current
        ? onCompleteAuthRef.current(data)
        : ({ ...data, user_metadata: {} } as PKCEUser);
      if (user) onLoginRef.current(user);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  function login(authParams: { scope: string; [key: string]: unknown }) {
    authRef.current?.authenticate(authParams, (err, data) => {
      if (err) {
        setLoginError(err.toString());
        return;
      }
      if (data) {
        const user: PKCEUser = { ...data, user_metadata: {} };
        onLoginRef.current(user);
      }
    });
  }

  return { login, loginError, setLoginError, authRef };
}

export default function PKCEAuthenticationPage({
  inProgress,
  config,
  onLogin,
  t,
}: PKCEAuthenticationPageProps) {
  const { login, loginError } = usePkceAuth(
    () => {
      // Old configuration options, available from the backend configuration
      const {
        base_url: backend_base_url = '',
        app_id: backend_app_id = '',
        auth_endpoint: backend_auth_endpoint = 'oauth2/authorize',
        auth_token_endpoint: backend_auth_token_endpoint = 'oauth2/token',
      } = config.backend;
      // New configuration options, separately defined in the "auth" configuration
      const {
        use_oidc = false,
        base_url = backend_base_url,
        auth_endpoint = backend_auth_endpoint,
        auth_token_endpoint = backend_auth_token_endpoint,
        app_id = backend_app_id,
        auth_token_endpoint_content_type = 'application/x-www-form-urlencoded; charset=utf-8',
      } = config.auth || {};

      return new PkceAuthenticator({
        base_url,
        app_id,
        use_oidc,
        auth_endpoint,
        auth_token_endpoint,
        auth_token_endpoint_content_type,
      });
    },
    onLogin,
    {
      onCompleteAuth(data) {
        const {
          email_claim = 'email',
          full_name_claim,
          first_name_claim,
          last_name_claim,
          avatar_url_claim,
        } = config.auth || {};
        const normalizeClaims = normalizeClaimsToUser(
          email_claim,
          full_name_claim,
          first_name_claim,
          last_name_claim,
          avatar_url_claim,
        );
        const user: PKCEUser = { ...data, user_metadata: {} };
        if (data.access_token) {
          user.token = data.access_token;
          try {
            user.claims = jwtDecode<JWTClaims>(data.access_token);
            normalizeClaims(user, user.claims);
          } catch {
            /* Ignore */
          }
        }
        if (data.id_token && typeof data.id_token === 'string') {
          try {
            user.idClaims = jwtDecode<JWTClaims>(data.id_token);
            normalizeClaims(user, user.idClaims);
          } catch {
            /* Ignore */
          }
        }
        return user;
      },
    },
  );

  function handleLogin() {
    const scope = config.auth?.scope || config.auth_scope || 'openid email';
    login({ scope });
  }

  return (
    <AuthenticationPage
      onLogin={handleLogin}
      loginDisabled={inProgress}
      loginErrorMessage={loginError}
      logoUrl={config.logo?.src} // Deprecated, replaced by `logo.src`
      logo={config.logo}
      siteUrl={config.site_url}
      renderButtonContent={() => (
        <React.Fragment>
          <LoginButtonIcon type="link" /> {inProgress ? t('auth.loggingIn') : t('auth.login')}
        </React.Fragment>
      )}
      t={t}
    />
  );
}
