import styled from '@emotion/styled';
import React from 'react';

import { buttons, GoBackButton, shadows } from '@/ui/default/index';

import type { TranslateFunction } from '@/ui/default/index';

// Content-only (no logo / page centering): the standalone chrome comes from
// the host — `StandaloneAuthPage` on the default app path, or a custom shell.
const StyledAuthenticationPage = styled.section`
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 20px;
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
`;

interface AuthenticationPageConfig {
  site_url: string;
  logo?: {
    src: string,
  };
  logo_url?: string;
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
  // `showDirectoryPicker()` (and the `requestPermission()` re-grant it feeds)
  // only works from inside a user gesture, so the click handler itself has
  // to be what calls `authenticate()` — there's no way to trigger the picker
  // from a restored session without one.
  function handleLogin(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onLogin(null);
  }

  return (
    <StyledAuthenticationPage>
      <LoginButton disabled={inProgress} onClick={handleLogin}>
        {inProgress ? t('auth.loggingIn') : t('auth.login')}
      </LoginButton>
      {config.site_url && <GoBackButton href={config.site_url} t={t}></GoBackButton>}
    </StyledAuthenticationPage>
  );
}
