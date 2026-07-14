import React from 'react';
import styled from '@emotion/styled';
import partial from 'lodash/partial';

import {
  AuthenticationPage,
  buttons,
  shadows,
  colors,
  colorsRaw,
  lengths,
  zIndex,
} from '@/ui/default/index';

import type {
  AuthClient,
  NetlifyAuthenticationPageProps,
  NetlifyAuthenticationPageState,
  NetlifyIdentityUser,
} from './types';

const LoginButton = styled.button`
  ${buttons.button};
  ${shadows.dropDeep};
  ${buttons.default};
  ${buttons.gray};

  padding: 0 30px;
  display: block;
  margin-top: 20px;
  margin-left: auto;
`;

const AuthForm = styled.form`
  width: 350px;
  margin-top: -80px;
`;

const AuthInput = styled.input`
  background-color: ${colorsRaw.white};
  border-radius: ${lengths.borderRadius};

  font-size: 14px;
  padding: 10px;
  margin-bottom: 15px;
  margin-top: 6px;
  width: 100%;
  position: relative;
  z-index: ${zIndex.zIndex1};

  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px ${colors.active};
  }
`;

const ErrorMessage = styled.p`
  color: ${colors.errorText};
`;

interface NetlifyAuthHandlers {
  handleIdentityLogin: (user: NetlifyIdentityUser) => void;
  handleIdentityLogout: () => void;
  handleIdentityError: (err: Error) => void;
}

const handlersRef: { current: NetlifyAuthHandlers | null } = { current: null };

if (window.netlifyIdentity) {
  window.netlifyIdentity.on('login', (user: NetlifyIdentityUser) => {
    handlersRef.current?.handleIdentityLogin(user);
  });
  window.netlifyIdentity.on('logout', () => {
    handlersRef.current?.handleIdentityLogout();
  });
  window.netlifyIdentity.on('error', (err: Error) => {
    handlersRef.current?.handleIdentityError(err);
  });
}

function NetlifyAuthenticationPage({
  error,
  inProgress,
  config,
  onLogin,
  t,
}: NetlifyAuthenticationPageProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<NetlifyAuthenticationPageState['errors']>({});

  const onLoginRef = React.useRef(onLogin);
  onLoginRef.current = onLogin;
  const tRef = React.useRef(t);
  tRef.current = t;

  React.useEffect(() => {
    handlersRef.current = {
      handleIdentityLogin(user: NetlifyIdentityUser) {
        onLoginRef.current(user);
        window.netlifyIdentity?.close();
      },
      handleIdentityLogout() {
        window.netlifyIdentity?.open();
      },
      handleIdentityError(err: Error) {
        if (err?.message?.match(/^Failed to load settings from.+\.netlify\/identity$/)) {
          window.netlifyIdentity?.close();
          setErrors(prev => ({ ...prev, identity: tRef.current('auth.errors.identitySettings') }));
        }
      },
    };
    if (window.netlifyIdentity?.currentUser()) {
      onLoginRef.current(window.netlifyIdentity.currentUser()!);
      window.netlifyIdentity.close();
    }
    return () => {
      handlersRef.current = null;
    };
  }, []);

  function handleIdentity() {
    const user = window.netlifyIdentity?.currentUser();
    if (user) {
      onLogin(user);
    } else {
      window.netlifyIdentity?.open();
    }
  }

  function handleChange(name: 'email' | 'password', e: React.ChangeEvent<HTMLInputElement>) {
    if (name === 'email') setEmail(e.target.value);
    else setPassword(e.target.value);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nextErrors: NetlifyAuthenticationPageState['errors'] = {};
    if (!email) nextErrors.email = t('auth.errors.email');
    if (!password) nextErrors.password = t('auth.errors.password');

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      const client = await NetlifyAuthenticationPage.authClient();
      const user = await client.login(email, password, true);
      onLogin(user);
    } catch (err: unknown) {
      const e = err as { description?: string; msg?: string };
      setErrors({ server: e.description || e.msg || String(err) });
    }
  }

  if (window.netlifyIdentity) {
    if (errors.identity) {
      return (
        <AuthenticationPage
          siteUrl={config.site_url}
          onLogin={handleIdentity}
          renderPageContent={() => (
            <a
              href="https://docs.netlify.com/visitor-access/git-gateway/#setup-and-settings"
              target="_blank"
              rel="noopener noreferrer"
            >
              {errors.identity}
            </a>
          )}
          t={t}
        />
      );
    }
    return (
      <AuthenticationPage
        siteUrl={config.site_url}
        onLogin={handleIdentity}
        renderButtonContent={() => t('auth.loginWithNetlifyIdentity')}
        t={t}
      />
    );
  }

  return (
    <AuthenticationPage
      siteUrl={config.site_url}
      renderPageContent={() => (
        <AuthForm onSubmit={handleLogin}>
          {!error ? null : <ErrorMessage>{error}</ErrorMessage>}
          {!errors.server ? null : <ErrorMessage>{String(errors.server)}</ErrorMessage>}
          <ErrorMessage>{errors.email || null}</ErrorMessage>
          <AuthInput
            type="text"
            name="email"
            placeholder="Email"
            value={email}
            onChange={partial(handleChange, 'email')}
          />
          <ErrorMessage>{errors.password || null}</ErrorMessage>
          <AuthInput
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={partial(handleChange, 'password')}
          />
          <LoginButton disabled={inProgress}>
            {inProgress ? t('auth.loggingIn') : t('auth.login')}
          </LoginButton>
        </AuthForm>
      )}
      t={t}
    />
  );
}

NetlifyAuthenticationPage.authClient = (() =>
  Promise.reject(new Error('authClient not configured'))) as () => Promise<AuthClient>;

export default NetlifyAuthenticationPage;
