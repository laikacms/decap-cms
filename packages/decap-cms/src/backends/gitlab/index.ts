import API from './API';
import AuthenticationPage from './AuthenticationPage';
import GitLabBackend from './implementation';

export const DecapCmsBackendGitlab = {
  GitLabBackend,
  API,
  AuthenticationPage,
};
export { API, AuthenticationPage, GitLabBackend };
export type { CommitAuthor, Config } from './API';
