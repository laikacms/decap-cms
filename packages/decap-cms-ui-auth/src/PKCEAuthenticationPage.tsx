import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { jwtDecode } from 'jwt-decode';
import { PkceAuthenticator, PkceAuthResult } from 'decap-cms-lib-auth';
import { AuthenticationPage, Icon } from 'decap-cms-ui-default';
import type {
  JWTClaims,
  PKCEAuthenticationPageProps,
  PKCEAuthenticationPageState,
  PKCEUser,
} from './types';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

function normalizeClaimsToUser(
  email_claim: string,
  full_name_claim?: string,
  first_name_claim?: string,
  last_name_claim?: string,
  avatar_url_claim?: string,
): (user: PKCEUser, claims?: JWTClaims) => void {
  return (user: PKCEUser, claims?: JWTClaims) => {
    if (!claims) return;

    if (!user.email && claims[email_claim]) {
      user.email = claims[email_claim] as string;
    }
    if (!user.user_metadata.full_name && full_name_claim && claims[full_name_claim]) {
      user.user_metadata.full_name = claims[full_name_claim] as string;
    }
    if (!user.user_metadata.full_name && (first_name_claim || last_name_claim)) {
      const name: string[] = [];
      if (first_name_claim && claims[first_name_claim])
        name.push(claims[first_name_claim] as string);
      if (last_name_claim && claims[last_name_claim]) name.push(claims[last_name_claim] as string);
      if (name.length) {
        user.user_metadata.full_name = name.join(' ');
      }
    }
    if (!user.user_metadata.avatar_url && avatar_url_claim && claims[avatar_url_claim]) {
      user.user_metadata.avatar_url = claims[avatar_url_claim] as string;
    }
  };
}

export default class PKCEAuthenticationPage extends React.Component<
  PKCEAuthenticationPageProps,
  PKCEAuthenticationPageState
> {
  static propTypes = {
    inProgress: PropTypes.bool,
    config: PropTypes.object.isRequired,
    onLogin: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
  };

  state: PKCEAuthenticationPageState = {};

  auth!: PkceAuthenticator;

  componentDidMount() {
    // Old configuration options, available from the backend configuration
    const {
      base_url: backend_base_url = '',
      app_id: backend_app_id = '',
      auth_endpoint: backend_auth_endpoint = 'oauth2/authorize',
      auth_token_endpoint: backend_auth_token_endpoint = 'oauth2/token',
    } = this.props.config.backend;
    // New configuration options, separately defined in the "auth" configuration
    const {
      use_oidc = false,
      base_url = backend_base_url,
      auth_endpoint = backend_auth_endpoint,
      auth_token_endpoint = backend_auth_token_endpoint,
      app_id = backend_app_id,
      auth_token_endpoint_content_type = 'application/x-www-form-urlencoded; charset=utf-8',
      email_claim = 'email',
      full_name_claim,
      first_name_claim,
      last_name_claim,
      avatar_url_claim,
    } = this.props.config.auth || {};

    const normalizeClaims = normalizeClaimsToUser(
      email_claim,
      full_name_claim,
      first_name_claim,
      last_name_claim,
      avatar_url_claim,
    );

    this.auth = new PkceAuthenticator({
      base_url,
      app_id,
      use_oidc,
      auth_endpoint,
      auth_token_endpoint,
      auth_token_endpoint_content_type,
    });

    // Complete authentication if we were redirected back from the provider.
    this.auth.completeAuth((err, data) => {
      if (err) {
        this.setState({ loginError: err.toString() });
        return;
      }

      if (!data) return;

      const user: PKCEUser = {
        ...data,
        user_metadata: {},
      };
      if (data.access_token) {
        user.token = data.access_token;
        try {
          user.claims = jwtDecode<JWTClaims>(data.access_token);
          normalizeClaims(user, user.claims);
        } catch {
          /* Ignore */
        }
      }
      if (data.id_token && typeof data.id_token === 'string') {
        try {
          user.idClaims = jwtDecode<JWTClaims>(data.id_token);
          normalizeClaims(user, user.idClaims);
        } catch {
          /* Ignore */
        }
      }

      this.props.onLogin(user);
    });
  }

  handleLogin = () => {
    const scope = this.props.config.auth?.scope || this.props.config.auth_scope || 'openid email';
    this.auth.authenticate({ scope }, (err, data) => {
      if (err) {
        this.setState({ loginError: err.toString() });
        return;
      }
      if (data) {
        const user: PKCEUser = {
          ...data,
          user_metadata: {},
        };
        this.props.onLogin(user);
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
        logoUrl={config.logo?.src} // Deprecated, replaced by `logo.src`
        logo={config.logo}
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
}
