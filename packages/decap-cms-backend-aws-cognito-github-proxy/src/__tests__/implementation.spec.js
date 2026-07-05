import AwsCognitoGitHubProxyBackend from '../implementation';

describe('AwsCognitoGitHubProxyBackend', () => {
  const config = {
    backend: {
      repo: 'someowner/somerepo',
      base_url: 'https://cognito.example.com',
      open_authoring: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('currentUser', () => {
    it('logs out and rejects with "Token expired" when the response is a 401', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(config);
      backend.logout = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({ status: 401 });

      await expect(backend.currentUser({ token: 'expired-token' })).rejects.toBe('Token expired');

      expect(backend.logout).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('https://cognito.example.com/oauth2/userInfo', {
        headers: {
          Authorization: 'Bearer expired-token',
        },
      });
    });

    it('maps the userInfo response into a GitHubUser', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(config);
      backend.logout = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ email: 'someone@example.com' }),
      });

      await expect(backend.currentUser({ token: 'valid-token' })).resolves.toEqual({
        name: 'someone@example.com',
        login: 'somerepo',
        avatar_url: 'https://github.com/somerepo.png',
      });

      expect(backend.logout).not.toHaveBeenCalled();
    });

    it('memoizes the current user promise so fetch is only called once', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(config);
      backend.logout = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ email: 'someone@example.com' }),
      });

      const first = await backend.currentUser({ token: 'valid-token' });
      const second = await backend.currentUser({ token: 'valid-token' });

      expect(first).toEqual(second);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPullRequestAuthor', () => {
    it('returns the pull request user login when present', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(config);

      await expect(backend.getPullRequestAuthor({ user: { login: 'octocat' } })).resolves.toBe(
        'octocat',
      );
    });

    it('returns undefined when the pull request has no user', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(config);

      await expect(backend.getPullRequestAuthor({ user: null })).resolves.toBeUndefined();
      await expect(backend.getPullRequestAuthor({})).resolves.toBeUndefined();
    });
  });
});
