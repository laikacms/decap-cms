import React from 'react';
import styled from '@emotion/styled';

import { NetlifyAuthenticator, ImplicitAuthenticator } from '../../lib/auth/index';
import { AuthenticationPage, Icon } from '../../ui/default/index';

import type { TranslateFunction } from '../../ui/default/index';
import type { ImplicitAuthResult, NetlifyAuthResult } from '../../lib/auth/index';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

type AuthResult = ImplicitAuthResult | NetlifyAuthResult;

interface BitbucketAuthenticationPageProps {
  onLogin: (data: AuthResult) => void;
  inProgress?: boolean;
  base_url?: string;
  siteId?: string;
  authEndpoint?: string;
  config: {
    backend: {
      auth_type?: string;
      base_url?: string;
      auth_endpoint?: string;
      app_id?: string;
    };
    logo_url?: string;
    logo?: { src?: string; show_in_header?: boolean };
    site_url?: string;
  };
  clearHash?: () => void;
  t: TranslateFunction;
}

export default function BitbucketAuthenticationPage({
  onLogin,
  inProgress,
  base_url,
  siteId,
  authEndpoint,
  config,
  clearHash,
  t,
}: BitbucketAuthenticationPageProps) {
  const [loginError, setLoginError] = React.useState<string | undefined>();
  const authRef = React.useRef<ImplicitAuthenticator | NetlifyAuthenticator | null>(null);
  const authSettingsRef = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    const { auth_type: authType = '' } = config.backend;

    if (authType === 'implicit') {
      const {
        base_url: implicitBaseUrl = 'https://bitbucket.org',
        auth_endpoint = 'site/oauth2/authorize',
        app_id = '',
      } = config.backend;

      const auth = new ImplicitAuthenticator({
        base_url: implicitBaseUrl,
        auth_endpoint,
        app_id,
        clearHash,
      });
      authRef.current = auth;
      authSettingsRef.current = { scope: 'repository:write' };
      // Complete implicit authentication if we were redirected back from the provider.
      auth.completeAuth((err, data) => {
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
        base_url,
        site_id:
          document.location.host.split(':')[0] === 'localhost' ? 'demo.decapcms.org' : siteId,
        auth_endpoint: authEndpoint,
      });
      authSettingsRef.current = { provider: 'bitbucket', scope: 'repo' };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only OAuth completion
  }, []);

  function handleLogin() {
    (authRef.current as any)?.authenticate(
      authSettingsRef.current,
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
      logoUrl={config.logo?.src}
      logo={config.logo}
      siteUrl={config.site_url}
      renderButtonContent={() => (
        <React.Fragment>
          <LoginButtonIcon type="bitbucket" />
          {inProgress ? t('auth.loggingIn') : t('auth.loginWithBitbucket')}
        </React.Fragment>
      )}
      t={t}
    />
  );
}
