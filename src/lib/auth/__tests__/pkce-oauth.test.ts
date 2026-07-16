import { describe, expect, it } from 'vitest';

import PkceAuthenticator from '@/lib/auth/pkce-oauth';

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
});
