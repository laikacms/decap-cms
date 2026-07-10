import { API } from '../github/index';
import AwsCognitoGitHubProxyBackend from './implementation';

export const DecapCmsBackendAwsCognitoGithubProxy = {
  AwsCognitoGitHubProxyBackend,
  API,
};

export { AwsCognitoGitHubProxyBackend, API };
