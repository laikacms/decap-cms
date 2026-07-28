import '../test-setup.js';

import { buildAuthorizeUrl, exchangeCodeForToken, GitHubTokenExchangeError } from '../github';

describe('buildAuthorizeUrl', () => {
  it('builds a GitHub authorize URL with the expected params', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: 'client-id',
        redirectUri: 'https://oauth.example.com/oauth/callback',
        state: 'signed-state',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://oauth.example.com/oauth/callback');
    expect(url.searchParams.get('state')).toBe('signed-state');
    expect(url.searchParams.get('scope')).toBe('repo,user');
  });

  it('honors a custom scope and GitHub Enterprise base URL', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: 'client-id',
        redirectUri: 'https://oauth.example.com/oauth/callback',
        state: 'signed-state',
        scope: 'repo',
        githubAuthorizeUrl: 'https://ghe.example.com/login/oauth/authorize',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://ghe.example.com/login/oauth/authorize');
    expect(url.searchParams.get('scope')).toBe('repo');
  });
});

describe('exchangeCodeForToken', () => {
  const originalFetch = window.fetch;

  afterEach(() => {
    window.fetch = originalFetch;
  });

  it('returns the access token on success', async () => {
    window.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'tok_123', token_type: 'bearer', scope: 'repo' }),
        {
          status: 200,
        },
      ),
    ) as unknown as typeof fetch;

    const result = await exchangeCodeForToken({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      code: 'the-code',
      redirectUri: 'https://oauth.example.com/oauth/callback',
    });

    expect(result).toEqual({ token: 'tok_123', tokenType: 'bearer', scope: 'repo' });
    const [, requestInit] = (window.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(requestInit.body)).toEqual({
      client_id: 'client-id',
      client_secret: 'client-secret',
      code: 'the-code',
      redirect_uri: 'https://oauth.example.com/oauth/callback',
    });
  });

  it('throws when GitHub returns an OAuth error', async () => {
    window.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'bad_verification_code', error_description: 'expired code' }),
        {
          status: 200,
        },
      ),
    ) as unknown as typeof fetch;

    await expect(
      exchangeCodeForToken({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        code: 'the-code',
        redirectUri: 'https://oauth.example.com/oauth/callback',
      }),
    ).rejects.toThrow(GitHubTokenExchangeError);
  });

  it('throws on a non-2xx response', async () => {
    window.fetch = jest
      .fn()
      .mockResolvedValue(new Response('', { status: 500 })) as unknown as typeof fetch;

    await expect(
      exchangeCodeForToken({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        code: 'the-code',
        redirectUri: 'https://oauth.example.com/oauth/callback',
      }),
    ).rejects.toThrow(GitHubTokenExchangeError);
  });
});
