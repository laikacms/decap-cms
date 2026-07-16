import styled from '@emotion/styled';
import React from 'react';

import { ImplicitAuthenticator, NetlifyAuthenticator, PkceAuthenticator } from '@/lib/auth/index';
import { AuthenticationPage, Icon } from '@/ui/default/index';

import type { ImplicitAuthResult, NetlifyAuthResult, PkceAuthResult } from '@/lib/auth/index';
import type { TranslateFunction } from '@/ui/default/index';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

type AuthResult = ImplicitAuthResult | PkceAuthResult | NetlifyAuthResult;
type Authenticator = ImplicitAuthenticator | PkceAuthenticator | NetlifyAuthenticator;

const clientSideAuthenticators = {
  pkce: ({
    base_url,
    auth_endpoint,
    app_id,
    auth_token_endpoint,
  }: {
    base_url: string,
    auth_endpoint: string,
    app_id: string,
    auth_token_endpoint: string,
  }) =>
    new PkceAuthenticator({
      base_url,
      auth_endpoint,
      app_id,
      auth_token_endpoint,
      auth_token_endpoint_content_type: 'application/json; charset=utf-8',
    }),

  implicit: ({
    base_url,
    auth_endpoint,
    app_id,
    clearHash,
  }: {
    base_url: string,
    auth_endpoint: string,
    app_id: string,
    clearHash?: () => void,
  }) =>
    new ImplicitAuthenticator({
      base_url,
      auth_endpoint,
      app_id,
      clearHash,
    }),
};

interface GitLabAuthenticationPageProps {
  onLogin: (data: AuthResult) => void;
  inProgress?: boolean;
  base_url?: string;
  siteId?: string;
  authEndpoint?: string;
  config: {
    backend: {
      auth_type?: string,
      base_url?: string,
      auth_endpoint?: string,
      app_id?: string,
    },
    logo_url?: string,
    logo?: { src?: string, show_in_header?: boolean },
    site_url?: string,
  };
  clearHash?: () => void;
  t: TranslateFunction;
}

export default function GitLabAuthenticationPage({
  onLogin,
  inProgress,
  base_url: propsBaseUrl,
  siteId,
  authEndpoint,
  config,
  clearHash,
  t,
}: GitLabAuthenticationPageProps) {
  const [loginError, setLoginError] = React.useState<string | undefined>();
  const authRef = React.useRef<Authenticator | null>(null);

  React.useEffect(() => {
    const {
      auth_type: authType = '',
      base_url = 'https://gitlab.com',
      auth_endpoint = 'oauth/authorize',
      app_id = '',
    } = config.backend;

    const authenticatorFactory = clientSideAuthenticators[authType as keyof typeof clientSideAuthenticators];
    if (authenticatorFactory) {
      const auth = authenticatorFactory({
        base_url,
        auth_endpoint,
        app_id,
        auth_token_endpoint: 'oauth/token',
        clearHash,
      } as {
        base_url: string,
        auth_endpoint: string,
        app_id: string,
        auth_token_endpoint: string,
        clearHash?: () => void,
      });
      authRef.current = auth;
      // Complete authentication if we were redirected back from the provider.
      (auth as any).completeAuth((err: Error | null, data?: AuthResult) => {
        if (err) {
          setLoginError(err.toString());
          return;
        }
        if (data) {
          onLogin(data);
        }
      });
    } else {
      authRef.current = new NetlifyAuthenticator({
        base_url: propsBaseUrl,
        site_id: document.location.host.split(':')[0] === 'localhost' ? 'demo.decapcms.org' : siteId,
        auth_endpoint: authEndpoint,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only OAuth completion
  }, []);

  function handleLogin() {
    (authRef.current as any)?.authenticate(
      { provider: 'gitlab', scope: 'api' },
      (err: Error | null, data?: AuthResult) => {
        if (err) {
          setLoginError(err.toString());
          return;
        }
        if (data) {
          onLogin(data);
        }
      },
    );
  }

  return (
    <AuthenticationPage
      onLogin={handleLogin}
      loginDisabled={inProgress}
      loginErrorMessage={loginError}
      siteUrl={config.site_url}
      renderButtonContent={() => (
        <React.Fragment>
          <LoginButtonIcon type="gitlab" /> {inProgress ? t('auth.loggingIn') : t('auth.loginWithGitLab')}
        </React.Fragment>
      )}
      t={t}
    />
  );
}
