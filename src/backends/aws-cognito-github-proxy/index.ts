import { API } from '@/backends/github/index';
import AwsCognitoGitHubProxyBackend from './implementation';

export const DecapCmsBackendAwsCognitoGithubProxy = {
  AwsCognitoGitHubProxyBackend,
  API,
};

export { AwsCognitoGitHubProxyBackend, API };
