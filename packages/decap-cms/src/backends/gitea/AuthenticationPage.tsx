import styled from '@emotion/styled';
import React from 'react';

import { PkceAuthenticator } from '@/lib/auth/index';
import { AuthenticationPage, Icon, PatLoginForm } from '@/ui/default/index';

import type { PkceAuthResult } from '@/lib/auth/index';
import type { TranslateFunction } from '@/ui/default/index';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

interface GiteaAuthenticationPageProps {
  inProgress?: boolean;
  config: {
    backend: { base_url?: string, app_id?: string, pat_auth?: boolean },
    logo_url?: string,
    logo?: { src?: string, show_in_header?: boolean },
    site_url?: string,
  };
  onLogin: (data: PkceAuthResult) => void;
  t: TranslateFunction;
}

export default function GiteaAuthenticationPage({
  inProgress,
  config,
  onLogin,
  t,
}: GiteaAuthenticationPageProps) {
  const [loginError, setLoginError] = React.useState<string | undefined>();
  const authRef = React.useRef<PkceAuthenticator | null>(null);

  React.useEffect(() => {
    const { base_url = 'https://try.gitea.io', app_id = '' } = config.backend;
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

  function handlePatLogin(token: string) {
    onLogin({ token } as PkceAuthResult);
  }

  return (
    <AuthenticationPage
      onLogin={handleLogin}
      loginDisabled={inProgress}
      loginErrorMessage={loginError}
      siteUrl={config.site_url}
      renderPageContent={
        config.backend.pat_auth
          ? () => <PatLoginForm onSubmit={handlePatLogin} disabled={inProgress} t={t} />
          : undefined
      }
      renderButtonContent={() => (
        <React.Fragment>
          <LoginButtonIcon type="gitea" /> {inProgress ? t('auth.loggingIn') : t('auth.loginWithGitea')}
        </React.Fragment>
      )}
      t={t}
    />
  );
}
