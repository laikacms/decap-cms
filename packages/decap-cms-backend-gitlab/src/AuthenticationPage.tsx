import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { NetlifyAuthenticator, ImplicitAuthenticator, PkceAuthenticator } from 'decap-cms-lib-auth';
import { AuthenticationPage, Icon } from 'decap-cms-ui-default';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { ImplicitAuthResult, PkceAuthResult, NetlifyAuthResult } from 'decap-cms-lib-auth';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

type AuthResult = ImplicitAuthResult | PkceAuthResult | NetlifyAuthResult;
type Authenticator = ImplicitAuthenticator | PkceAuthenticator | NetlifyAuthenticator;

const clientSideAuthenticators = {
  pkce: ({
    base_url,
    auth_endpoint,
    app_id,
    auth_token_endpoint,
  }: {
    base_url: string;
    auth_endpoint: string;
    app_id: string;
    auth_token_endpoint: string;
  }) =>
    new PkceAuthenticator({
      base_url,
      auth_endpoint,
      app_id,
      auth_token_endpoint,
      auth_token_endpoint_content_type: 'application/json; charset=utf-8',
    }),

  implicit: ({
    base_url,
    auth_endpoint,
    app_id,
    clearHash,
  }: {
    base_url: string;
    auth_endpoint: string;
    app_id: string;
    clearHash?: () => void;
  }) =>
    new ImplicitAuthenticator({
      base_url,
      auth_endpoint,
      app_id,
      clearHash,
    }),
};

interface GitLabAuthenticationPageProps {
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

interface GitLabAuthenticationPageState {
  loginError?: string;
}

export default class GitLabAuthenticationPage extends React.Component<
  GitLabAuthenticationPageProps,
  GitLabAuthenticationPageState
> {
  static propTypes = {
    onLogin: PropTypes.func.isRequired,
    inProgress: PropTypes.bool,
    base_url: PropTypes.string,
    siteId: PropTypes.string,
    authEndpoint: PropTypes.string,
    config: PropTypes.object.isRequired,
    clearHash: PropTypes.func,
    t: PropTypes.func.isRequired,
  };

  state: GitLabAuthenticationPageState = {};
  auth!: Authenticator;

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(
      GitLabAuthenticationPage.propTypes,
      this.props,
      'prop',
      'GitLabAuthenticationPage',
    );

    const {
      auth_type: authType = '',
      base_url = 'https://gitlab.com',
      auth_endpoint = 'oauth/authorize',
      app_id = '',
    } = this.props.config.backend;

    const authenticatorFactory =
      clientSideAuthenticators[authType as keyof typeof clientSideAuthenticators];
    if (authenticatorFactory) {
      this.auth = authenticatorFactory({
        base_url,
        auth_endpoint,
        app_id,
        auth_token_endpoint: 'oauth/token',
        clearHash: this.props.clearHash,
      } as {
        base_url: string;
        auth_endpoint: string;
        app_id: string;
        auth_token_endpoint: string;
        clearHash?: () => void;
      });
      // Complete authentication if we were redirected back to from the provider.

      (this.auth as any).completeAuth((err: Error | null, data?: AuthResult) => {
        if (err) {
          this.setState({ loginError: err.toString() });
          return;
        }
        if (data) {
          this.props.onLogin(data);
        }
      });
    } else {
      this.auth = new NetlifyAuthenticator({
        base_url: this.props.base_url,
        site_id:
          document.location.host.split(':')[0] === 'localhost'
            ? 'demo.decapcms.org'
            : this.props.siteId,
        auth_endpoint: this.props.authEndpoint,
      });
    }
  }

  handleLogin = () => {
    (this.auth as any).authenticate(
      { provider: 'gitlab', scope: 'api' },
      (err: Error | null, data?: AuthResult) => {
        if (err) {
          this.setState({ loginError: err.toString() });
          return;
        }
        if (data) {
          this.props.onLogin(data);
        }
      },
    );
  };

  render() {
    const { inProgress, config, t } = this.props;
    return (
      <AuthenticationPage
        onLogin={this.handleLogin}
        loginDisabled={inProgress}
        loginErrorMessage={this.state.loginError}
        logoUrl={config.logo?.src}
        logo={config.logo}
        siteUrl={config.site_url}
        renderButtonContent={() => (
          <React.Fragment>
            <LoginButtonIcon type="gitlab" />{' '}
            {inProgress ? t('auth.loggingIn') : t('auth.loginWithGitLab')}
          </React.Fragment>
        )}
        t={t}
      />
    );
  }
}
