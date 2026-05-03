import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { NetlifyAuthenticator, type NetlifyAuthResult } from 'decap-cms-lib-auth';
import { AuthenticationPage, Icon } from 'decap-cms-ui-default';
import type GitHub from './implementation';
import type { CmsConfig, CmsUser, TranslateFunction } from 'decap-cms-lib-util';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

const ForkApprovalContainer = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-around;
  flex-grow: 0.2;
`;
const ForkButtonsContainer = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-around;
  align-items: center;
`;

interface GitHubAuthenticationPageProps {
  onLogin?: (e?: any) => void;
  inProgress?: boolean;
  base_url?: string;
  siteId?: string;
  authEndpoint?: string;
  clearHash?: (...args: unknown[]) => unknown;
  t: TranslateFunction;
  backend: GitHub;
}

export default class GitHubAuthenticationPage extends React.Component<GitHubAuthenticationPageProps> {
  static propTypes = {
    onLogin: PropTypes.func,
    inProgress: PropTypes.bool,
    base_url: PropTypes.string,
    siteId: PropTypes.string,
    authEndpoint: PropTypes.string,
    clearHash: PropTypes.func,
    t: PropTypes.func.isRequired,
  };

  state: {
    loginError?: string;
    requestingFork?: boolean;
    findingFork?: boolean;
    approveFork?: () => void;
    refuseFork?: () => void;
  } = {};

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(
      GitHubAuthenticationPage.propTypes,
      this.props,
      'prop',
      'GitHubAuthenticationPage',
    );
  }

  getPermissionToFork = () => {
    return new Promise<boolean>((resolve, reject) => {
      this.setState({
        requestingFork: true,
        approveFork: () => {
          this.setState({ requestingFork: false });
          resolve(true);
        },
        refuseFork: () => {
          this.setState({ requestingFork: false });
          resolve(false);
        },
      });
    });
  };

  loginWithOpenAuthoring(data: NetlifyAuthResult) {
    const { backend } = this.props;

    this.setState({ findingFork: true });
    return backend
      .authenticateWithFork({
        userData: data as CmsUser,
        getPermissionToFork: this.getPermissionToFork,
      })
      .catch(err => {
        this.setState({ findingFork: false });
        console.error(err);
        throw err;
      });
  }

  handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const cfg = {
      base_url: this.props.base_url,
      site_id:
        document.location.host.split(':')[0] === 'localhost'
          ? 'demo.decapcms.org'
          : this.props.siteId,
      auth_endpoint: this.props.authEndpoint,
    };
    const auth = new NetlifyAuthenticator(cfg);

    const config = this.props.backend.config;

    const { open_authoring: openAuthoring = false, auth_scope: authScope = '' } = config.backend;

    const scope = authScope || (openAuthoring ? 'public_repo' : 'repo');
    auth.authenticate({ provider: 'github', scope }, (err, data) => {
      if (err) {
        this.setState({ loginError: err.toString() });
        return;
      }
      if (openAuthoring) {
        return this.loginWithOpenAuthoring(data!).then(() => this.props.onLogin?.());
      }
      this.props.onLogin?.();
    });
  };

  renderLoginButton = () => {
    const { inProgress, t } = this.props;
    return inProgress || this.state.findingFork ? (
      t('auth.loggingIn')
    ) : (
      <React.Fragment>
        <LoginButtonIcon type="github" />
        {t('auth.loginWithGitHub')}
      </React.Fragment>
    );
  };

  getAuthenticationPageRenderArgs() {
    const { requestingFork } = this.state;

    if (requestingFork) {
      const { approveFork, refuseFork } = this.state;
      return {
        renderPageContent: ({
          LoginButton,
          TextButton,
          showAbortButton,
        }: {
          LoginButton: React.FC<React.PropsWithChildren & { onClick: (() => void) | undefined }>;
          TextButton: React.FC<React.PropsWithChildren & { onClick: (() => void) | undefined }>;
          showAbortButton: boolean;
        }) => (
          <ForkApprovalContainer>
            <p>
              Open Authoring is enabled: we need to use a fork on your github account. (If a fork
              already exists, we&#39;ll use that.)
            </p>
            <ForkButtonsContainer>
              <LoginButton onClick={approveFork}>Fork the repo</LoginButton>
              {showAbortButton && (
                <TextButton onClick={refuseFork}>Don&#39;t fork the repo</TextButton>
              )}
            </ForkButtonsContainer>
          </ForkApprovalContainer>
        ),
      };
    }

    return {
      renderButtonContent: this.renderLoginButton,
    };
  }

  render() {
    const config = this.props.backend.config;
    const { inProgress, t } = this.props;
    const { loginError, requestingFork, findingFork } = this.state;

    return (
      <AuthenticationPage
        onLogin={this.handleLogin}
        loginDisabled={inProgress || findingFork || requestingFork}
        loginErrorMessage={loginError}
        logoUrl={config.logo?.src} // Deprecated, replaced by `logo.src`
        logo={config.logo}
        siteUrl={config.site_url}
        {...this.getAuthenticationPageRenderArgs()}
        t={t}
      />
    );
  }
}
