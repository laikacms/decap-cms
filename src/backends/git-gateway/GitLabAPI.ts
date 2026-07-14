import { API as GitlabAPI } from '@/backends/gitlab/index';
import { unsentRequest } from '@/lib/util/index';

import type { Config as GitLabConfig, CommitAuthor } from '@/backends/gitlab/index';
import type { ApiRequest } from '@/lib/util/index';

type Config = GitLabConfig & { tokenPromise: () => Promise<string>; commitAuthor: CommitAuthor };

export default class API extends GitlabAPI {
  tokenPromise: () => Promise<string>;

  constructor(config: Config) {
    super(config);
    this.tokenPromise = config.tokenPromise;
    this.commitAuthor = config.commitAuthor;
    this.repoURL = '';
  }

  withAuthorizationHeaders = async (req: ApiRequest) => {
    const token = await this.tokenPromise();
    return unsentRequest.withHeaders(
      {
        Authorization: `Bearer ${token}`,
      },
      req,
    );
  };

  hasWriteAccess = () => Promise.resolve(true);
}
