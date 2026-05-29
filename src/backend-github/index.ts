import GitHubBackend from './implementation';
import API from './API';
import AuthenticationPage from './AuthenticationPage';

export const DecapCmsBackendGithub = {
  GitHubBackend,
  API,
  AuthenticationPage,
};
export { GitHubBackend, API, AuthenticationPage };
export type { Diff } from './API';
export type { GitHubUser, Config } from './types/api';
