import { API } from '@/backends/github/index';
import AwsCognitoGitHubProxyBackend from './implementation';

export const DecapCmsBackendAwsCognitoGithubProxy = {
  AwsCognitoGitHubProxyBackend,
  API,
};

export { API, AwsCognitoGitHubProxyBackend };
