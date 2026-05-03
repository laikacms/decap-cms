import React from 'react';
import styled from '@emotion/styled';
import { PkceAuthenticator } from 'decap-cms-lib-auth';
import { AuthenticationPage, Icon } from 'decap-cms-ui-default';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { PkceAuthResult } from 'decap-cms-lib-auth';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

interface GiteaAuthenticationPageProps {
  inProgress?: boolean;
  config: {
    backend: { base_url?: string; app_id?: string };
    logo_url?: string;
    logo?: { src?: string; show_in_header?: boolean };
    site_url?: string;
  };
  onLogin: (data: PkceAuthResult) => void;
  t: TranslateFunction;
}

interface GiteaAuthenticationPageState {
  loginError?: string;
}

export default class GiteaAuthenticationPage extends React.Component<
  GiteaAuthenticationPageProps,
  GiteaAuthenticationPageState
> {
  state: GiteaAuthenticationPageState = {};
  auth!: PkceAuthenticator;

  componentDidMount() {
    const { base_url = 'https://try.gitea.io', app_id = '' } = this.props.config.backend;
    this.auth = new PkceAuthenticator({
      base_url,
      auth_endpoint: 'login/oauth/authorize',
      app_id,
      auth_token_endpoint: 'login/oauth/access_token',
      auth_token_endpoint_content_type: 'application/json; charset=utf-8',
    });
    // Complete authentication if we were redirected back to from the provider.
    this.auth.completeAuth((err, data) => {
      if (err) {
        this.setState({ loginError: err.toString() });
        return;
      } else if (data) {
        this.props.onLogin(data);
      }
    });
  }

  handleLogin = () => {
    this.auth.authenticate({ scope: 'repository' }, (err, data) => {
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
            <LoginButtonIcon type="gitea" />{' '}
            {inProgress ? t('auth.loggingIn') : t('auth.loginWithGitea')}
          </React.Fragment>
        )}
        t={t}
      />
    );
  }
}
