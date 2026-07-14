import * as React from 'react';

import { GitHubBackend } from '@/backends/github/index';
import GenericPKCEAuthenticationPage from './AuthenticationPage';

import type { GitHubUser } from '@/backends/github/index';
import type { CmsConfig } from '@/lib/util/index';
import type { AuthenticationPageProps } from '@/ui/default/AuthenticationPage';
import type { Endpoints } from '@octokit/types';

export default class AwsCognitoGitHubProxyBackend extends GitHubBackend {
  constructor(config: CmsConfig, options = {}) {
    super(config, options);

    this.bypassWriteAccessCheckForAppTokens = true;
    this.tokenKeyword = 'Bearer';
  }

  authComponent() {
    const wrappedAuthenticationPage = (props: AuthenticationPageProps) => (
      <GenericPKCEAuthenticationPage {...(props as any)} backend={this} />
    );
    wrappedAuthenticationPage.displayName = 'AuthenticationPage';
    return wrappedAuthenticationPage;
  }

  async currentUser({ token }: { token: string }): Promise<GitHubUser> {
    if (!this._currentUserPromise) {
      this._currentUserPromise = fetch(this.baseUrl + '/oauth2/userInfo', {
        headers: {
          Authorization: `${this.tokenKeyword} ${token}`,
        },
      }).then(async (res: Response): Promise<GitHubUser> => {
        if (res.status == 401) {
          this.logout();
          return Promise.reject('Token expired');
        }
        const userInfo = await res.json();
        const owner = this.originRepo.split('/')[1];
        return {
          name: userInfo.email,
          login: owner,
          avatar_url: `https://github.com/${owner}.png`,
        } as GitHubUser;
      });
    }
    return this._currentUserPromise;
  }

  async getPullRequestAuthor(
    pullRequest: Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data'][0],
  ) {
    return pullRequest.user?.login;
  }
}
