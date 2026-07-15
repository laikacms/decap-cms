import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GoTrue, { GoTrueError, GoTrueUser } from '@/backends/git-gateway/GoTrue';

const STORAGE_KEY = 'gotrue.user';
const API_URL = 'https://example.com/.netlify/identity';

function makeJwt(exp: number) {
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'none' })}.${encode({ exp })}.signature`;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (/content-type/i.test(name) ? 'application/json' : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const freshJwt = () => makeJwt(Math.floor(Date.now() / 1000) + 3600);
const expiredJwt = () => makeJwt(Math.floor(Date.now() / 1000) - 10);

const userData = {
  id: 'user-id',
  email: 'user@example.com',
  user_metadata: { full_name: 'Test User', avatar_url: 'https://example.com/avatar.png' },
  app_metadata: { roles: ['editor'] },
};

describe('GoTrue', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('should exchange credentials for a token and load the user profile', async () => {
      const accessToken = freshJwt();
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ access_token: accessToken, refresh_token: 'refresh-1' }),
        )
        .mockResolvedValueOnce(jsonResponse(userData));

      const client = new GoTrue({ APIUrl: `${API_URL}/` });
      const user = await client.login('user@example.com', 'secret', true);

      const [tokenUrl, tokenOptions] = fetchMock.mock.calls[0];
      expect(tokenUrl).toBe(`${API_URL}/token`);
      expect(tokenOptions.method).toBe('POST');
      expect(tokenOptions.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(tokenOptions.body).toBe(
        'grant_type=password&username=user%40example.com&password=secret',
      );

      const [userUrl, userOptions] = fetchMock.mock.calls[1];
      expect(userUrl).toBe(`${API_URL}/user`);
      expect(userOptions.headers.Authorization).toBe(`Bearer ${accessToken}`);

      expect(user.email).toBe('user@example.com');
      expect(user.user_metadata).toEqual(userData.user_metadata);
      await expect(user.jwt()).resolves.toBe(accessToken);
    });

    it('should persist the session in the gotrue-js storage format when remember is set', async () => {
      const accessToken = freshJwt();
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ access_token: accessToken, refresh_token: 'refresh-1' }),
        )
        .mockResolvedValueOnce(jsonResponse(userData));

      await new GoTrue({ APIUrl: API_URL }).login('user@example.com', 'secret', true);

      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
      expect(stored.url).toBe(API_URL);
      expect(stored.token.access_token).toBe(accessToken);
      expect(stored.token.refresh_token).toBe('refresh-1');
      expect(stored.token.expires_at).toBeGreaterThan(Date.now());
      expect(stored.email).toBe('user@example.com');
      expect(Object.keys(stored).some(key => key.startsWith('_'))).toBe(false);
    });

    it('should not persist the session when remember is not set', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ access_token: freshJwt(), refresh_token: 'r' }))
        .mockResolvedValueOnce(jsonResponse(userData));

      await new GoTrue({ APIUrl: API_URL }).login('user@example.com', 'secret');

      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should reject with the API error description', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { error: 'invalid_grant', error_description: 'No user found with that email' },
          400,
        ),
      );

      const login = new GoTrue({ APIUrl: API_URL }).login('user@example.com', 'wrong');

      await expect(login).rejects.toBeInstanceOf(GoTrueError);
      await expect(login).rejects.toMatchObject({
        status: 400,
        description: 'No user found with that email',
      });
    });
  });

  describe('currentUser', () => {
    it('should return null when no session is stored', () => {
      expect(new GoTrue({ APIUrl: API_URL }).currentUser()).toBeNull();
    });

    it('should recover a session stored by gotrue-js', async () => {
      const accessToken = freshJwt();
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          url: API_URL,
          token: {
            access_token: accessToken,
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'refresh-1',
            expires_at: Date.now() + 3600_000,
          },
          ...userData,
        }),
      );

      const user = new GoTrue({ APIUrl: API_URL }).currentUser();

      expect(user).toBeInstanceOf(GoTrueUser);
      expect(user!.email).toBe('user@example.com');
      expect(user!.user_metadata).toEqual(userData.user_metadata);
      await expect(user!.jwt()).resolves.toBe(accessToken);
    });

    it('should return null for corrupt or incomplete sessions', () => {
      const client = new GoTrue({ APIUrl: API_URL });

      window.localStorage.setItem(STORAGE_KEY, 'not json');
      expect(client.currentUser()).toBeNull();

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: 'user@example.com' }));
      expect(client.currentUser()).toBeNull();
    });
  });

  describe('jwt', () => {
    function storedUser(accessToken: string) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          url: API_URL,
          token: { access_token: accessToken, refresh_token: 'refresh-1' },
          ...userData,
        }),
      );
      return new GoTrue({ APIUrl: API_URL }).currentUser()!;
    }

    it('should refresh an expired token and update the stored session', async () => {
      const newToken = freshJwt();
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ access_token: newToken, refresh_token: 'refresh-2' }),
      );

      const user = storedUser(expiredJwt());

      await expect(user.jwt()).resolves.toBe(newToken);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(`${API_URL}/token`);
      expect(options.body).toBe('grant_type=refresh_token&refresh_token=refresh-1');

      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
      expect(stored.token.access_token).toBe(newToken);
      expect(stored.token.refresh_token).toBe('refresh-2');
    });

    it('should share a single refresh request between concurrent jwt calls', async () => {
      const newToken = freshJwt();
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ access_token: newToken, refresh_token: 'refresh-2' }),
      );

      const user = storedUser(expiredJwt());
      const tokens = await Promise.all([user.jwt(), user.jwt(), user.jwt()]);

      expect(tokens).toEqual([newToken, newToken, newToken]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should clear the session when the refresh fails', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error_description: 'refresh denied' }, 401));

      const user = storedUser(expiredJwt());

      await expect(user.jwt()).rejects.toMatchObject({ description: 'refresh denied' });
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('logout', () => {
    it('should call the logout endpoint and clear the session', async () => {
      const accessToken = freshJwt();
      fetchMock.mockResolvedValueOnce(jsonResponse({}));

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          url: API_URL,
          token: { access_token: accessToken, refresh_token: 'refresh-1' },
          ...userData,
        }),
      );
      const user = new GoTrue({ APIUrl: API_URL }).currentUser()!;

      await user.logout();

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(`${API_URL}/logout`);
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe(`Bearer ${accessToken}`);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should clear the session even when the logout request fails', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('network down'));

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          url: API_URL,
          token: { access_token: freshJwt(), refresh_token: 'refresh-1' },
          ...userData,
        }),
      );
      const user = new GoTrue({ APIUrl: API_URL }).currentUser()!;

      await expect(user.logout()).resolves.toBeUndefined();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
