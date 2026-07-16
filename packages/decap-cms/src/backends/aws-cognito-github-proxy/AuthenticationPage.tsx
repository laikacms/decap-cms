import styled from '@emotion/styled';
import React from 'react';

import { PkceAuthenticator } from '@/lib/auth/index';
import { type PKCEAuthenticationPageProps, type PKCEUser, usePkceAuth } from '@/ui/auth/index';
import { AuthenticationPage, Icon } from '@/ui/default/index';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

export default function AwsCognitoGitHubProxyAuthenticationPage({
  inProgress,
  config,
  onLogin,
  t,
}: PKCEAuthenticationPageProps) {
  const { login, loginError } = usePkceAuth(
    () => {
      const {
        base_url = '',
        app_id = '',
        auth_endpoint = 'oauth2/authorize',
        auth_token_endpoint = 'oauth2/token',
      } = config.backend;
      return new PkceAuthenticator({
        base_url,
        auth_endpoint,
        app_id,
        auth_token_endpoint,
        auth_token_endpoint_content_type: 'application/x-www-form-urlencoded; charset=utf-8',
      });
    },
    onLogin,
    {
      onCompleteAuth: data => ({ ...data, user_metadata: {} }) as PKCEUser,
    },
  );

  function handleLogin() {
    login({ scope: 'https://api.github.com/repo openid email' });
  }

  return (
    <AuthenticationPage
      onLogin={handleLogin}
      loginDisabled={inProgress}
      loginErrorMessage={loginError}
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
