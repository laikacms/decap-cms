import { afterEach, describe, expect, it, vi } from 'vitest';

import PkceAuthenticator from '@/lib/auth/pkce-oauth';
import { createNonce } from '@/lib/auth/utils';

describe('PkceAuthenticator', () => {
  it('throws a clear error instead of building a relative auth URL when base_url is omitted', () => {
    // DCMS-647: the README used to document `base_url` as optional, but the
    // constructor built `auth_url`/`oidc_url` from it unconditionally. With
    // no `base_url`, `auth_url` ended up as a relative string (e.g.
    // `/oauth/authorize`), which later blew up with a cryptic
    // `Invalid URL` from `new URL()` inside `authenticate()`. `base_url` has
    // no sane absolute fallback (it's an arbitrary provider domain), so the
    // fix is to fail fast in the constructor with a message that names the
    // real problem.
    expect(() => new PkceAuthenticator({ app_id: 'client-id' })).toThrow(/base_url/);
  });

  it('throws when base_url is omitted and use_oidc is set', () => {
    expect(() => new PkceAuthenticator({ use_oidc: true, app_id: 'client-id' })).toThrow(
      /base_url/,
    );
  });

  it('builds absolute auth/token URLs when base_url is provided', () => {
    const authenticator = new PkceAuthenticator({
      base_url: 'https://try.gitea.io',
      auth_endpoint: 'login/oauth/authorize',
      auth_token_endpoint: 'login/oauth/access_token',
      app_id: 'client-id',
    });

    expect(authenticator.auth_url).toBe('https://try.gitea.io/login/oauth/authorize');
    expect(authenticator.auth_token_url).toBe('https://try.gitea.io/login/oauth/access_token');
  });

  describe('DCMS-806: client_id when app_id is omitted', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      window.history.replaceState(null, '', '/');
      window.sessionStorage.clear();
    });

    function setUpCallbackState(): void {
      const nonce: string = createNonce();
      const state: string = JSON.stringify({ auth_type: 'pkce', nonce });
      window.history.pushState(
        null,
        '',
        `/?code=auth-code&state=${encodeURIComponent(state)}`,
      );
    }

    it('defaults appID to an empty string, matching the authorization redirect fallback', () => {
      const authenticator = new PkceAuthenticator({ base_url: 'https://try.gitea.io' });
      expect(authenticator.appID).toBe('');
    });

    it('sends client_id as "" (not omitted) in a JSON token exchange body', async () => {
      const authenticator = new PkceAuthenticator({
        base_url: 'https://try.gitea.io',
        auth_endpoint: 'login/oauth/authorize',
        auth_token_endpoint: 'login/oauth/access_token',
      });
      setUpCallbackState();

      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({ access_token: 'token' })));

      await new Promise<void>((resolve, reject) => {
        void authenticator.completeAuth(err => (err ? reject(err) : resolve()));
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body: unknown = JSON.parse(init.body as string);
      expect(body).toMatchObject({ client_id: '' });
      expect(body).toHaveProperty('client_id');
    });

    it('sends client_id as "" (not omitted) in a form-urlencoded token exchange body', async () => {
      const authenticator = new PkceAuthenticator({
        base_url: 'https://try.gitea.io',
        auth_endpoint: 'login/oauth/authorize',
        auth_token_endpoint: 'login/oauth/access_token',
        auth_token_endpoint_content_type: 'application/x-www-form-urlencoded',
      });
      setUpCallbackState();

      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({ access_token: 'token' })));

      await new Promise<void>((resolve, reject) => {
        void authenticator.completeAuth(err => (err ? reject(err) : resolve()));
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const params = new URLSearchParams(init.body as string);
      expect(params.has('client_id')).toBe(true);
      expect(params.get('client_id')).toBe('');
    });
  });

  describe('completeAuth', () => {
    function createAuthenticator() {
      return new PkceAuthenticator({
        base_url: 'https://provider.example.com',
        auth_endpoint: 'oauth2/authorize',
        auth_token_endpoint: 'oauth2/token',
        app_id: 'client-id',
      });
    }

    it('leaves the URL and history state untouched when not returning from a provider', async () => {
      // The auth page mounts (and calls completeAuth) on every reload while a
      // cached session is being restored. It used to rewrite the URL
      // unconditionally, wiping the `#/...` route and `history.state` on
      // every reload — breaking deep links and shareable URLs.
      window.history.replaceState({ usr: null, key: 'abc', idx: 3 }, '', '/#/collections/posts');
      const cb = vi.fn();

      await createAuthenticator().completeAuth(cb);

      expect(window.location.hash).toBe('#/collections/posts');
      expect(window.history.state).toEqual({ usr: null, key: 'abc', idx: 3 });
      expect(cb).not.toHaveBeenCalled();
    });

    it('scrubs the code params and restores the stashed hash route when returning from a provider', async () => {
      window.sessionStorage.setItem('decap-cms-pkce-return-hash', '#/collections/posts');
      const state = encodeURIComponent(JSON.stringify({ auth_type: 'pkce', nonce: 'nonce-value' }));
      window.history.replaceState(
        { usr: null, key: 'abc', idx: 0 },
        '',
        `/?code=one-time-code&state=${state}`,
      );
      const cb = vi.fn();

      await createAuthenticator().completeAuth(cb);

      expect(window.location.search).toBe('');
      expect(window.location.hash).toBe('#/collections/posts');
      expect(window.sessionStorage.getItem('decap-cms-pkce-return-hash')).toBeNull();
      // No nonce was stashed by `authenticate()` in this test, so the flow
      // stops at nonce validation — after the URL is already cleaned up.
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid nonce' }));
    });
  });

  describe('refresh', () => {
    function createAuthenticator() {
      return new PkceAuthenticator({
        use_oidc: false,
        base_url: 'https://example.com',
        auth_endpoint: 'authorize',
        auth_token_endpoint: 'oauth/token',
        auth_token_endpoint_content_type: 'application/json',
        app_id: 'app-id',
      });
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('exchanges a refresh token for new credentials', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 7200,
          }),
          { status: 200 },
        ),
      );

      const authenticator = createAuthenticator();
      const result = await authenticator.refresh({ refresh_token: 'old-refresh-token' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            client_id: 'app-id',
            grant_type: 'refresh_token',
            redirect_uri: document.location.origin + document.location.pathname,
            refresh_token: 'old-refresh-token',
          }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        }),
      );
    });

    it('sends a form encoded body when configured', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ access_token: 'new-access-token' }), { status: 200 }),
      );

      const authenticator = new PkceAuthenticator({
        use_oidc: false,
        base_url: 'https://example.com',
        auth_endpoint: 'authorize',
        auth_token_endpoint: 'oauth/token',
        auth_token_endpoint_content_type: 'application/x-www-form-urlencoded; charset=utf-8',
        app_id: 'app-id',
      });
      await authenticator.refresh({ refresh_token: 'old-refresh-token' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/oauth/token',
        expect.objectContaining({
          body: new URLSearchParams(
            Object.entries({
              client_id: 'app-id',
              grant_type: 'refresh_token',
              redirect_uri: document.location.origin + document.location.pathname,
              refresh_token: 'old-refresh-token',
            }),
          ).toString(),
        }),
      );
    });

    it('throws when the provider returns an error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Refresh token is invalid',
          }),
          { status: 400 },
        ),
      );

      const authenticator = createAuthenticator();

      await expect(authenticator.refresh({ refresh_token: 'expired' })).rejects.toThrow(
        'Refresh token is invalid',
      );
    });

    it('throws when no refresh token is available', async () => {
      const authenticator = createAuthenticator();

      await expect(authenticator.refresh({})).rejects.toThrow('Missing refresh token');
    });
  });
});

describe('#1735: explicit redirect_uri and returnTo state', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
  });

  const FIXED_CALLBACK = 'https://app.example.com/decap/callback';
  const EMBEDDED_ROUTE = '/projects/p1/decap/embedded';

  function authenticator(overrides: Record<string, unknown> = {}) {
    return new PkceAuthenticator({
      base_url: 'https://provider.example.com',
      auth_endpoint: 'oauth2/authorize',
      auth_token_endpoint: 'oauth2/token',
      app_id: 'client-id',
      redirect_uri: FIXED_CALLBACK,
      return_to: EMBEDDED_ROUTE,
      ...overrides,
    });
  }

  function landOnCallback(state: unknown): void {
    window.history.pushState(
      null,
      '',
      `/?code=auth-code&state=${encodeURIComponent(JSON.stringify(state))}`,
    );
  }

  it('sends the configured redirect_uri to the provider instead of the current URL', async () => {
    const url = await authenticator().buildAuthorizationUrl({ scope: 'openid' });

    expect(url.searchParams.get('redirect_uri')).toBe(FIXED_CALLBACK);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('round-trips returnTo through the state alongside the nonce', async () => {
    const url = await authenticator().buildAuthorizationUrl({ scope: 'openid' });

    const state = JSON.parse(url.searchParams.get('state') as string) as {
      auth_type: string,
      nonce: string,
      returnTo: string,
    };
    expect(state.auth_type).toBe('pkce');
    expect(state.returnTo).toBe(EMBEDDED_ROUTE);
    expect(state.nonce).toEqual(expect.any(String));

    // The nonce the provider will echo back is the one held in sessionStorage.
    const stored = JSON.parse(
      window.sessionStorage.getItem('decap-cms-auth') as string,
    ) as { nonce: string };
    expect(stored.nonce).toBe(state.nonce);
  });

  it('replays the configured redirect_uri on the token exchange', async () => {
    const nonce = createNonce();
    landOnCallback({ auth_type: 'pkce', nonce, returnTo: EMBEDDED_ROUTE });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ access_token: 'access-token' })));

    await new Promise<void>((resolve, reject) => {
      void authenticator().completeAuth(err => (err ? reject(err) : resolve()));
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ redirect_uri: FIXED_CALLBACK });
  });

  it('resolves the API token from the access token, never the id token', async () => {
    const nonce = createNonce();
    landOnCallback({ auth_type: 'pkce', nonce, returnTo: EMBEDDED_ROUTE });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'access-token', id_token: 'id-token' })),
    );

    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      void authenticator().completeAuth((err, data) =>
        err ? reject(err) : resolve(data as unknown as Record<string, unknown>),
      );
    });

    expect(result.token).toBe('access-token');
    expect(result.token).not.toBe('id-token');
  });

  it('rejects a replayed callback: the nonce is consumed on first use', async () => {
    const nonce = createNonce();
    const state = { auth_type: 'pkce', nonce, returnTo: EMBEDDED_ROUTE };
    landOnCallback(state);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'access-token' })),
    );

    await new Promise<void>((resolve, reject) => {
      void authenticator().completeAuth(err => (err ? reject(err) : resolve()));
    });

    // Same URL again - the stored nonce is gone, so no second exchange happens.
    landOnCallback(state);
    const replayError = await new Promise<Error | null>(resolve => {
      void authenticator().completeAuth(err => resolve(err));
    });
    expect(replayError?.message).toMatch(/nonce/i);
  });

  it('rejects a mismatched nonce', async () => {
    createNonce();
    landOnCallback({ auth_type: 'pkce', nonce: 'not-the-stored-nonce', returnTo: EMBEDDED_ROUTE });

    const error = await new Promise<Error | null>(resolve => {
      void authenticator().completeAuth(err => resolve(err));
    });
    expect(error?.message).toMatch(/nonce/i);
  });

  it.each([
    '//evil.example.com',
    'https://evil.example.com/steal',
    '/\\evil.example.com',
  ])('rejects a returnTo that escapes the app origin: %s', async returnTo => {
    const nonce = createNonce();
    landOnCallback({ auth_type: 'pkce', nonce, returnTo });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const error = await new Promise<Error | null>(resolve => {
      void authenticator().completeAuth(err => resolve(err));
    });

    expect(error?.message).toMatch(/return path/i);
    // Rejected before any token exchange, and before the nonce was consumed.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses to construct with an off-origin return_to', () => {
    expect(() => authenticator({ return_to: 'https://evil.example.com' })).toThrow(/return_to/);
  });
});
