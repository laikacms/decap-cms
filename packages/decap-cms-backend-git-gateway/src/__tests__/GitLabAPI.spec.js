import API from '../GitLabAPI';

jest.mock('decap-cms-lib-util', () => {
  const actual = jest.requireActual('decap-cms-lib-util');
  return {
    ...actual,
    unsentRequest: {
      ...actual.unsentRequest,
      withHeaders: jest.fn((headers, req) => ({ ...req, headers: { ...(req && req.headers), ...headers } })),
    },
  };
});

import { unsentRequest } from 'decap-cms-lib-util';

describe('GitLabAPI (git-gateway)', () => {
  const baseConfig = {
    apiRoot: 'https://example.com/.netlify/git/gitlab',
    tokenPromise: () => Promise.resolve('test-token'),
    commitAuthor: { name: 'Test User', email: 'test@example.com' },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('sets repoURL to empty string', () => {
      const api = new API(baseConfig);
      expect(api.repoURL).toBe('');
    });

    it('sets tokenPromise from config', () => {
      const tokenPromise = () => Promise.resolve('my-token');
      const api = new API({ ...baseConfig, tokenPromise });
      expect(api.tokenPromise).toBe(tokenPromise);
    });

    it('sets commitAuthor from config', () => {
      const commitAuthor = { name: 'Jane', email: 'jane@example.com' };
      const api = new API({ ...baseConfig, commitAuthor });
      expect(api.commitAuthor).toEqual(commitAuthor);
    });
  });

  describe('withAuthorizationHeaders', () => {
    it('calls tokenPromise and injects Authorization Bearer header', async () => {
      const tokenPromise = jest.fn().mockResolvedValue('abc123');
      const api = new API({ ...baseConfig, tokenPromise });
      const req = { url: 'https://example.com/api' };

      const result = await api.withAuthorizationHeaders(req);

      expect(tokenPromise).toHaveBeenCalledTimes(1);
      expect(unsentRequest.withHeaders).toHaveBeenCalledWith(
        { Authorization: 'Bearer abc123' },
        req,
      );
      expect(result.headers).toMatchObject({ Authorization: 'Bearer abc123' });
    });

    it('uses the token returned by tokenPromise', async () => {
      const tokenPromise = jest.fn().mockResolvedValue('different-token');
      const api = new API({ ...baseConfig, tokenPromise });
      const req = {};

      await api.withAuthorizationHeaders(req);

      expect(unsentRequest.withHeaders).toHaveBeenCalledWith(
        { Authorization: 'Bearer different-token' },
        req,
      );
    });
  });

  describe('hasWriteAccess', () => {
    it('unconditionally resolves true', async () => {
      const api = new API(baseConfig);
      await expect(api.hasWriteAccess()).resolves.toBe(true);
    });
  });
});
