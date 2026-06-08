import { API } from '../backend-github/index';
import AwsCognitoGitHubProxyBackend from './implementation';

export const DecapCmsBackendAwsCognitoGithubProxy = {
  AwsCognitoGitHubProxyBackend,
  API,
};

export { AwsCognitoGitHubProxyBackend, API };
