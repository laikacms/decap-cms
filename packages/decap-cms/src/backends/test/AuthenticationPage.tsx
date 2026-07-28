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

  .decap-icon {
    margin-right: 18px;
  }
`;

// Optional identity fields: letting a dev-test user pick a login/name means
// two tabs of the same demo profile can sign in as different synthetic
// users (different `owner.id` for advisory entry locking, DCMS-1414)
// against the same shared `localStorage`, instead of always colliding on a
// single hardcoded identity.
const IdentityFields = styled.div`
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  width: 100%;
  max-width: 320px;
`;

const IdentityInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  border-radius: 4px;
  border: 1px solid #dfdfe3;
  font-size: 14px;
`;

interface AuthenticationPageConfig {
  site_url: string;
  logo?: {
    src: string,
  };
  logo_url?: string;
  backend: {
    login: boolean,
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
  const [login, setLogin] = React.useState('');
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    // Allow login screen to be skipped for demo purposes.
    if (config.backend.login === false) {
      onLogin(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only OAuth completion
  }, []);

  function handleLogin(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onLogin({ login: login.trim() || undefined, name: name.trim() || undefined });
  }

  return (
    <StyledAuthenticationPage>
      <IdentityFields>
        <IdentityInput
          type="text"
          placeholder="test-user"
          aria-label="Login (optional, for testing multi-user entry locking)"
          value={login}
          onChange={e => setLogin(e.target.value)}
        />
        <IdentityInput
          type="text"
          placeholder="Test User"
          aria-label="Display name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </IdentityFields>
      <LoginButton disabled={inProgress} onClick={handleLogin}>
        {inProgress ? t('auth.loggingIn') : t('auth.login')}
      </LoginButton>
      {config.site_url && <GoBackButton href={config.site_url} t={t}></GoBackButton>}
    </StyledAuthenticationPage>
  );
}
