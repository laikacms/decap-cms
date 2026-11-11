import API from '@/backends/gitlab/API';
import DecapTurboGitLabBackend from './implementation';

export const DecapCmsBackendTurboGitLab = {
  DecapTurboGitLabBackend,
  API,
};

export { API, DecapTurboGitLabBackend };
