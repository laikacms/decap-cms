import API from './API';
import AuthenticationPage from './AuthenticationPage';
import GitHubBackend from './implementation';

export const DecapCmsBackendGithub = {
  GitHubBackend,
  API,
  AuthenticationPage,
};
export { API, AuthenticationPage, GitHubBackend };
export type { Diff } from './API';
export type { Config, GitHubUser } from './types/api';
