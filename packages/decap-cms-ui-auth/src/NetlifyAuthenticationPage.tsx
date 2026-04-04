import PropTypes from 'prop-types';
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
} from 'decap-cms-ui-default';

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

// Logo configuration type
interface LogoConfig {
  src?: string;
  url?: string;
}

// Config type for authentication
interface AuthConfig {
  logo_url?: string;
  logo?: LogoConfig;
  site_url?: string;
}

// Props interface
interface NetlifyAuthenticationPageProps {
  onLogin: (user: NetlifyIdentityUser) => void;
  inProgress: boolean;
  error?: React.ReactNode;
  config: AuthConfig;
  t: (key: string) => string;
}

// State interface
interface NetlifyAuthenticationPageState {
  email: string;
  password: string;
  errors: {
    email?: string;
    password?: string;
    server?: string | Error;
    identity?: string;
  };
  loggingIn?: boolean;
}

// Auth client interface
interface AuthClient {
  login: (email: string, password: string, remember: boolean) => Promise<NetlifyIdentityUser>;
}

// Netlify Identity User type (from modules.d.ts)
interface NetlifyIdentityUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: Record<string, unknown>;
  token?: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    expires_at: number;
  };
}

let component: NetlifyAuthenticationPage | null = null;

if (window.netlifyIdentity) {
  window.netlifyIdentity.on('login', (user: NetlifyIdentityUser) => {
    component && component.handleIdentityLogin(user);
  });
  window.netlifyIdentity.on('logout', () => {
    component && component.handleIdentityLogout();
  });
  window.netlifyIdentity.on('error', (err: Error) => {
    component && component.handleIdentityError(err);
  });
}

export default class NetlifyAuthenticationPage extends React.Component<
  NetlifyAuthenticationPageProps,
  NetlifyAuthenticationPageState
> {
  static authClient: () => Promise<AuthClient>;

  static propTypes = {
    onLogin: PropTypes.func.isRequired,
    inProgress: PropTypes.bool.isRequired,
    error: PropTypes.node,
    config: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired,
  };

  loggedIn = false;

  constructor(props: NetlifyAuthenticationPageProps) {
    super(props);
    component = this;
  }

  state: NetlifyAuthenticationPageState = { email: '', password: '', errors: {} };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(
      NetlifyAuthenticationPage.propTypes,
      this.props,
      'prop',
      'GitGatewayAuthenticationPage',
    );

    if (!this.loggedIn && window.netlifyIdentity && window.netlifyIdentity.currentUser()) {
      this.props.onLogin(window.netlifyIdentity.currentUser()!);
      window.netlifyIdentity.close();
    }
  }

  componentWillUnmount() {
    component = null;
  }

  handleIdentityLogin = (user: NetlifyIdentityUser) => {
    this.props.onLogin(user);
    window.netlifyIdentity?.close();
  };

  handleIdentityLogout = () => {
    window.netlifyIdentity?.open();
  };

  handleIdentityError = (err: Error) => {
    if (err?.message?.match(/^Failed to load settings from.+\.netlify\/identity$/)) {
      window.netlifyIdentity?.close();
      this.setState({
        errors: { identity: this.props.t('auth.errors.identitySettings') },
      });
    }
  };

  handleIdentity = () => {
    const user = window.netlifyIdentity?.currentUser();
    if (user) {
      this.props.onLogin(user);
    } else {
      window.netlifyIdentity?.open();
    }
  };

  handleChange = (name: 'email' | 'password', e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ ...this.state, [name]: e.target.value });
  };

  handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { email, password } = this.state;
    const { t } = this.props;
    const errors: NetlifyAuthenticationPageState['errors'] = {};
    if (!email) {
      errors.email = t('auth.errors.email');
    }
    if (!password) {
      errors.password = t('auth.errors.password');
    }

    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    try {
      const client = await NetlifyAuthenticationPage.authClient();
      const user = await client.login(this.state.email, this.state.password, true);
      this.props.onLogin(user);
    } catch (error) {
      const err = error as { description?: string; msg?: string };
      this.setState({
        errors: { server: err.description || err.msg || String(error) },
        loggingIn: false,
      });
    }
  };

  render() {
    const { errors } = this.state;
    const { error, inProgress, config, t } = this.props;

    if (window.netlifyIdentity) {
      if (errors.identity) {
        return (
          <AuthenticationPage
            logoUrl={config.logo_url} // Deprecated, replaced by `logo.src`
            logo={config.logo}
            siteUrl={config.site_url}
            onLogin={this.handleIdentity}
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
      } else {
        return (
          <AuthenticationPage
            logoUrl={config.logo_url} // Deprecated, replaced by `logo.src`
            logo={config.logo}
            siteUrl={config.site_url}
            onLogin={this.handleIdentity}
            renderButtonContent={() => t('auth.loginWithNetlifyIdentity')}
            t={t}
          />
        );
      }
    }

    return (
      <AuthenticationPage
        logoUrl={config.logo_url} // Deprecated, replaced by `logo.src`
        logo={config.logo}
        siteUrl={config.site_url}
        renderPageContent={() => (
          <AuthForm onSubmit={this.handleLogin}>
            {!error ? null : <ErrorMessage>{error}</ErrorMessage>}
            {!errors.server ? null : <ErrorMessage>{String(errors.server)}</ErrorMessage>}
            <ErrorMessage>{errors.email || null}</ErrorMessage>
            <AuthInput
              type="text"
              name="email"
              placeholder="Email"
              value={this.state.email}
              onChange={partial(this.handleChange, 'email')}
            />
            <ErrorMessage>{errors.password || null}</ErrorMessage>
            <AuthInput
              type="password"
              name="password"
              placeholder="Password"
              value={this.state.password}
              onChange={partial(this.handleChange, 'password')}
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
}
