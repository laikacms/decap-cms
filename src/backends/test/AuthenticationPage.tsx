import React from 'react';
import styled from '@emotion/styled';

import { Icon, buttons, shadows, GoBackButton } from '../../ui/default/index';

import type { TranslateFunction } from '../../ui/default/index';

const StyledAuthenticationPage = styled.section`
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: 50px;
  height: 100vh;
`;

const PageLogoIcon = styled(Icon)`
  height: auto;
`;

const LoginButton = styled.button`
  ${buttons.button};
  ${shadows.dropDeep};
  ${buttons.default};
  ${buttons.gray};

  padding: 0 30px;
  margin-top: 0;
  display: flex;
  align-items: center;
  position: relative;

  ${Icon} {
    margin-right: 18px;
  }
`;

interface AuthenticationPageConfig {
  site_url: string;
  logo?: {
    src: string;
  };
  logo_url?: string;
  backend: {
    login: boolean;
  };
}

interface AuthenticationPageProps {
  onLogin: (...args: unknown[]) => unknown;
  inProgress?: boolean;
  config: AuthenticationPageConfig;
  t: TranslateFunction;
}

export default function AuthenticationPage({
  onLogin,
  inProgress,
  config,
  t,
}: AuthenticationPageProps) {
  React.useEffect(() => {
    // Allow login screen to be skipped for demo purposes.
    if (config.backend.login === false) {
      onLogin(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only OAuth completion
  }, []);

  function handleLogin(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onLogin(null);
  }

  return (
    <StyledAuthenticationPage>
      <PageLogoIcon size="300px" type="decap" />
      <LoginButton disabled={inProgress} onClick={handleLogin}>
        {inProgress ? t('auth.loggingIn') : t('auth.login')}
      </LoginButton>
      {config.site_url && <GoBackButton href={config.site_url} t={t}></GoBackButton>}
    </StyledAuthenticationPage>
  );
}
