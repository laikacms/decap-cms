import styled from '@emotion/styled';
import React from 'react';

import { PkceAuthenticator } from '@/lib/auth/index';
import { AuthenticationPage, Icon } from '@/ui/default/index';

import type { PkceAuthResult } from '@/lib/auth/index';
import type { TranslateFunction } from '@/ui/default/index';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

interface ForgejoAuthenticationPageProps {
  inProgress?: boolean;
  config: {
    backend: { api_root?: string, base_url?: string, app_id?: string },
    logo_url?: string,
    logo?: { src?: string, show_in_header?: boolean },
    site_url?: string,
  };
  onLogin: (data: PkceAuthResult) => void;
  t: TranslateFunction;
}

export default function ForgejoAuthenticationPage({
  inProgress,
  config,
  onLogin,
  t,
}: ForgejoAuthenticationPageProps) {
  const [loginError, setLoginError] = React.useState<string | undefined>();
  const authRef = React.useRef<PkceAuthenticator | null>(null);

  React.useEffect(() => {
    const { api_root, base_url: configuredBaseUrl, app_id = '' } = config.backend;
    // Forgejo/Codeberg have no single canonical instance (unlike Gitea's
    // try.gitea.io default), so the OAuth base URL is derived from api_root
    // (stripping the trailing /api/<version> segment) unless explicitly set.
    const base_url = configuredBaseUrl || (api_root ? api_root.replace(/\/api\/v\d+\/?$/, '') : '');
    if (!base_url) {
      setLoginError(
        'The Forgejo backend needs an "api_root" (or "base_url") in the backend configuration.',
      );
      return;
    }
    const auth = new PkceAuthenticator({
      base_url,
      auth_endpoint: 'login/oauth/authorize',
      app_id,
      auth_token_endpoint: 'login/oauth/access_token',
      auth_token_endpoint_content_type: 'application/json; charset=utf-8',
    });
    authRef.current = auth;
    // Complete authentication if we were redirected back from the provider.
    auth.completeAuth((err, data) => {
      if (err) {
        setLoginError(err.toString());
        return;
      } else if (data) {
        onLogin(data);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only OAuth completion
  }, []);

  function handleLogin() {
    authRef.current?.authenticate({ scope: 'repository' }, (err, data) => {
      if (err) {
        setLoginError(err.toString());
        return;
      }
      if (data) {
        onLogin(data);
      }
    });
  }

  return (
    <AuthenticationPage
      onLogin={handleLogin}
      loginDisabled={inProgress}
      loginErrorMessage={loginError}
      siteUrl={config.site_url}
      renderButtonContent={() => (
        <React.Fragment>
          <LoginButtonIcon type="forgejo" />{' '}
          {inProgress ? t('auth.loggingIn') : t('auth.loginWithForgejo')}
        </React.Fragment>
      )}
      t={t}
    />
  );
}
