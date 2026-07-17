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
        void authenticator.completeAuth((err) => (err ? reject(err) : resolve()));
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
        void authenticator.completeAuth((err) => (err ? reject(err) : resolve()));
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
});
