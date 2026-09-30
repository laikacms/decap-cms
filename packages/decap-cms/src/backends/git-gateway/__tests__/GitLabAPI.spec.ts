import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import API from '@/backends/git-gateway/GitLabAPI';

const commitAuthor = { name: 'Jane Doe', email: 'jane@example.com' };

function createApi(tokenPromise = () => Promise.resolve('token')) {
  return new API({
    apiRoot: 'https://site.netlify.com/.netlify/git/gitlab',
    tokenPromise,
    commitAuthor,
    branch: 'main',
    repo: 'group/project',
    squashMerges: false,
    initialWorkflowStatus: 'draft',
    cmsLabelPrefix: 'decap-cms/',
    requestFunction: undefined,
  });
}

describe('git-gateway gitlab API', () => {
  describe('constructor', () => {
    it('should set repoURL to an empty string instead of the project path', () => {
      expect(createApi().repoURL).toBe('');
    });

    it('should assign commitAuthor from config', () => {
      expect(createApi().commitAuthor).toBe(commitAuthor);
    });

    it('should assign tokenPromise from config', () => {
      const tokenPromise = () => Promise.resolve('abc');
      expect(createApi(tokenPromise).tokenPromise).toBe(tokenPromise);
    });
  });

  describe('withAuthorizationHeaders', () => {
    it('should add a Bearer authorization header from tokenPromise', async () => {
      const tokenPromise = vi.fn().mockResolvedValue('secret-token');
      const api = createApi(tokenPromise);

      const result = await api.withAuthorizationHeaders({ url: '/some-path' });

      expect(tokenPromise).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        headers: { Authorization: 'Bearer secret-token' },
      });
    });

    it('should preserve existing url and request headers', async () => {
      const api = createApi();

      const result = await api.withAuthorizationHeaders({
        url: 'https://site.netlify.com/.netlify/git/gitlab/some-path',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(result).toMatchObject({
        url: 'https://site.netlify.com/.netlify/git/gitlab/some-path',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      });
    });

    it('should reject when tokenPromise rejects', async () => {
      const api = createApi(() => Promise.reject(new Error('no token')));

      await expect(api.withAuthorizationHeaders({ url: '/x' })).rejects.toThrow('no token');
    });
  });

  describe('hasWriteAccess', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it('should resolve true without any network call', async () => {
      const tokenPromise = vi.fn().mockResolvedValue('token');
      const api = createApi(tokenPromise);

      await expect(api.hasWriteAccess()).resolves.toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(tokenPromise).not.toHaveBeenCalled();
    });
  });
});
