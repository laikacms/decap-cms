import React from 'react';
import styled from '@emotion/styled';

import { ImplicitAuthenticator } from '../../lib/auth/index';
import { AuthenticationPage, Icon } from '../../ui/default/index';

import type { TranslateFunction } from '../../ui/default/index';
import type { ImplicitAuthResult } from '../../lib/auth/index';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

interface AzureAuthenticationPageProps {
  onLogin: (data: ImplicitAuthResult) => void;
  inProgress?: boolean;
  base_url?: string;
  siteId?: string;
  authEndpoint?: string;
  config: {
    backend: { tenant_id?: string; app_id?: string };
    logo_url?: string;
    logo?: { src?: string; show_in_header?: boolean };
  };
  clearHash?: () => void;
  t: TranslateFunction;
}

export default function AzureAuthenticationPage({
  onLogin,
  inProgress,
  config,
  clearHash,
  t,
}: AzureAuthenticationPageProps) {
  const [loginError, setLoginError] = React.useState<string | undefined>();
  const authRef = React.useRef<ImplicitAuthenticator | null>(null);

  React.useEffect(() => {
    const auth = new ImplicitAuthenticator({
      base_url: `https://login.microsoftonline.com/${config.backend.tenant_id}`,
      auth_endpoint: 'oauth2/authorize',
      app_id: config.backend.app_id ?? '',
      clearHash,
    });
    authRef.current = auth;
    // Complete implicit authentication if we were redirected back from the provider.
    auth.completeAuth((err, data) => {
      if (err) {
        alert(err);
        return;
      }
      if (data) {
        onLogin(data);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only OAuth completion
  }, []);

  function handleLogin() {
    authRef.current?.authenticate(
      {
        scope: 'vso.code_full,user.read',
        resource: '499b84ac-1321-427f-aa17-267ca6975798',
        prompt: 'select_account',
      },
      (err, data) => {
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
      renderButtonContent={() => (
        <React.Fragment>
          <LoginButtonIcon type="azure" />
          {inProgress ? t('auth.loggingIn') : t('auth.loginWithAzure')}
        </React.Fragment>
      )}
      t={t}
    />
  );
}
