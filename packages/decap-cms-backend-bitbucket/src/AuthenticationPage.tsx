import React from 'react';
import styled from '@emotion/styled';
import { NetlifyAuthenticator, ImplicitAuthenticator } from 'decap-cms-lib-auth';
import { AuthenticationPage, Icon } from 'decap-cms-ui-default';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { ImplicitAuthResult, NetlifyAuthResult } from 'decap-cms-lib-auth';

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

interface BitbucketAuthenticationPageState {
  loginError?: string;
}

export default class BitbucketAuthenticationPage extends React.Component<
  BitbucketAuthenticationPageProps,
  BitbucketAuthenticationPageState
> {
  state: BitbucketAuthenticationPageState = {};
  auth!: ImplicitAuthenticator | NetlifyAuthenticator;
  authSettings!: Record<string, string>;

  componentDidMount() {
    const { auth_type: authType = '' } = this.props.config.backend;

    if (authType === 'implicit') {
      const {
        base_url = 'https://bitbucket.org',
        auth_endpoint = 'site/oauth2/authorize',
        app_id = '',
      } = this.props.config.backend;

      this.auth = new ImplicitAuthenticator({
        base_url,
        auth_endpoint,
        app_id,
        clearHash: this.props.clearHash,
      });
      // Complete implicit authentication if we were redirected back to from the provider.
      this.auth.completeAuth((err, data) => {
        if (err) {
          this.setState({ loginError: err.toString() });
          return;
        }
        if (data) {
          this.props.onLogin(data);
        }
      });
      this.authSettings = { scope: 'repository:write' };
    } else {
      this.auth = new NetlifyAuthenticator({
        base_url: this.props.base_url,
        site_id:
          document.location.host.split(':')[0] === 'localhost'
            ? 'demo.decapcms.org'
            : this.props.siteId,
        auth_endpoint: this.props.authEndpoint,
      });
      this.authSettings = { provider: 'bitbucket', scope: 'repo' };
    }
  }

  handleLogin = () => {
    (this.auth as any).authenticate(this.authSettings, (err: Error | null, data?: AuthResult) => {
      if (err) {
        this.setState({ loginError: err.toString() });
        return;
      }
      if (data) {
        this.props.onLogin(data);
      }
    });
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
            <LoginButtonIcon type="bitbucket" />
            {inProgress ? t('auth.loggingIn') : t('auth.loginWithBitbucket')}
          </React.Fragment>
        )}
        t={t}
      />
    );
  }
}
