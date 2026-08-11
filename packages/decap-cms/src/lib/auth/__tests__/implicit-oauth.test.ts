import { afterEach, describe, expect, it, vi } from 'vitest';

import ImplicitAuthenticator from '@/lib/auth/implicit-oauth';

describe('ImplicitAuthenticator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  describe('constructor', () => {
    it('builds auth_url from base_url and auth_endpoint without trailing slashes', () => {
      const authenticator = new ImplicitAuthenticator({
        base_url: 'https://example.com',
        auth_endpoint: 'oauth/authorize',
      });

      expect(authenticator.auth_url).toBe('https://example.com/oauth/authorize');
    });

    it('trims trailing/leading slashes on base_url and auth_endpoint', () => {
      const authenticator = new ImplicitAuthenticator({
        base_url: 'https://example.com/',
        auth_endpoint: '/oauth/authorize/',
      });

      expect(authenticator.auth_url).toBe('https://example.com/oauth/authorize');
    });

    it('falls back to empty strings when base_url and auth_endpoint are omitted', () => {
      const authenticator = new ImplicitAuthenticator({});

      expect(authenticator.auth_url).toBe('/');
    });

    it('stores app_id and clearHash from the config', () => {
      const clearHash = vi.fn();
      const authenticator = new ImplicitAuthenticator({
        base_url: 'https://example.com',
        auth_endpoint: 'oauth/authorize',
        app_id: 'client-id',
        clearHash,
      });

      expect(authenticator.appID).toBe('client-id');
      expect(authenticator.clearHash).toBe(clearHash);
    });
  });

  function stubDocument(overrides: {
    protocol?: string;
    hostname?: string;
    origin?: string;
    pathname?: string;
    hash?: string;
    assign?: (url: string) => void;
  }): void {
    vi.stubGlobal('document', {
      location: {
        protocol: overrides.protocol ?? 'https:',
        hostname: overrides.hostname ?? 'example.com',
        origin: overrides.origin ?? 'https://example.com',
        pathname: overrides.pathname ?? '/admin/',
        hash: overrides.hash ?? '',
        assign: overrides.assign ?? vi.fn(),
      },
    });
  }

  function createAuthenticator(): ImplicitAuthenticator {
    return new ImplicitAuthenticator({
      base_url: 'https://provider.example.com',
      auth_endpoint: 'oauth2/authorize',
      app_id: 'client-id',
    });
  }

  describe('authenticate', () => {
    it('rejects with an error over an insecure protocol without redirecting', () => {
      const assign = vi.fn();
      stubDocument({ protocol: 'http:', hostname: 'example.com', assign });
      const cb = vi.fn();

      createAuthenticator().authenticate({ scope: 'repo' }, cb);

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cannot authenticate over insecure protocol!' }),
      );
      expect(assign).not.toHaveBeenCalled();
    });

    it('allows http on localhost', () => {
      const assign = vi.fn();
      stubDocument({ protocol: 'http:', hostname: 'localhost', assign });
      const cb = vi.fn();

      createAuthenticator().authenticate({ scope: 'repo' }, cb);

      expect(cb).not.toHaveBeenCalled();
      expect(assign).toHaveBeenCalledTimes(1);
    });

    it('builds the redirect URL with client_id, redirect_uri, response_type, scope and state', () => {
      const assign = vi.fn();
      stubDocument({
        origin: 'https://app.example.com',
        pathname: '/admin/index.html',
        assign,
      });
      const cb = vi.fn();

      createAuthenticator().authenticate({ scope: 'repo' }, cb);

      expect(cb).not.toHaveBeenCalled();
      expect(assign).toHaveBeenCalledTimes(1);
      const redirectURL = new URL(assign.mock.calls[0][0] as string);
      expect(redirectURL.origin + redirectURL.pathname).toBe(
        'https://provider.example.com/oauth2/authorize',
      );
      expect(redirectURL.searchParams.get('client_id')).toBe('client-id');
      expect(redirectURL.searchParams.get('redirect_uri')).toBe(
        'https://app.example.com/admin/index.html',
      );
      expect(redirectURL.searchParams.get('response_type')).toBe('token');
      expect(redirectURL.searchParams.get('scope')).toBe('repo');
      expect(redirectURL.searchParams.has('prompt')).toBe(false);
      expect(redirectURL.searchParams.has('resource')).toBe(false);

      const state = JSON.parse(redirectURL.searchParams.get('state') as string) as {
        auth_type: string;
        nonce: string;
      };
      expect(state.auth_type).toBe('implicit');
      expect(state.nonce).toEqual(expect.any(String));
      const stored = JSON.parse(
        window.sessionStorage.getItem('decap-cms-auth') as string,
      ) as { nonce: string };
      expect(stored.nonce).toBe(state.nonce);
    });

    it('includes prompt and resource params when provided', () => {
      const assign = vi.fn();
      stubDocument({ assign });
      const cb = vi.fn();

      createAuthenticator().authenticate(
        { scope: 'repo', prompt: 'consent', resource: 'https://api.example.com' },
        cb,
      );

      const redirectURL = new URL(assign.mock.calls[0][0] as string);
      expect(redirectURL.searchParams.get('prompt')).toBe('consent');
      expect(redirectURL.searchParams.get('resource')).toBe('https://api.example.com');
    });

    it('defaults client_id to an empty string when app_id is omitted', () => {
      const assign = vi.fn();
      stubDocument({ assign });
      const authenticator = new ImplicitAuthenticator({
        base_url: 'https://provider.example.com',
        auth_endpoint: 'oauth2/authorize',
      });

      authenticator.authenticate({ scope: 'repo' }, vi.fn());

      const redirectURL = new URL(assign.mock.calls[0][0] as string);
      expect(redirectURL.searchParams.get('client_id')).toBe('');
    });
  });

  describe('completeAuth', () => {
    function setState(nonce: string): string {
      return encodeURIComponent(JSON.stringify({ auth_type: 'implicit', nonce }));
    }

    it('does nothing when the hash carries neither access_token nor error', () => {
      stubDocument({ hash: '#/collections/posts' });
      const cb = vi.fn();

      createAuthenticator().completeAuth(cb);

      expect(cb).not.toHaveBeenCalled();
    });

    it('reports a missing state parameter', () => {
      const clearHash = vi.fn();
      stubDocument({ hash: '#access_token=abc123' });
      const cb = vi.fn();
      const authenticator = new ImplicitAuthenticator({
        base_url: 'https://provider.example.com',
        auth_endpoint: 'oauth2/authorize',
        app_id: 'client-id',
        clearHash,
      });

      authenticator.completeAuth(cb);

      expect(clearHash).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Missing state parameter' }),
      );
    });

    it('reports an invalid nonce when the stored nonce does not match', () => {
      stubDocument({
        hash: `#access_token=abc123&state=${setState('not-the-stored-nonce')}`,
      });
      const cb = vi.fn();

      createAuthenticator().completeAuth(cb);

      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid nonce' }));
    });

    it('reports an invalid nonce when no nonce was ever stored', () => {
      stubDocument({
        hash: `#access_token=abc123&state=${setState('some-nonce')}`,
      });
      const cb = vi.fn();

      createAuthenticator().completeAuth(cb);

      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid nonce' }));
    });

    it('surfaces a provider error with its description', () => {
      const nonce = window.crypto.randomUUID();
      window.sessionStorage.setItem('decap-cms-auth', JSON.stringify({ nonce }));
      stubDocument({
        hash: `#error=access_denied&error_description=User+denied+access&state=${setState(nonce)}`,
      });
      const cb = vi.fn();

      createAuthenticator().completeAuth(cb);

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'access_denied: User denied access' }),
      );
    });

    it('extracts the access token and remaining params on success', () => {
      const nonce = window.crypto.randomUUID();
      window.sessionStorage.setItem('decap-cms-auth', JSON.stringify({ nonce }));
      stubDocument({
        hash: `#access_token=abc123&token_type=bearer&state=${setState(nonce)}`,
      });
      const cb = vi.fn();

      createAuthenticator().completeAuth(cb);

      expect(cb).toHaveBeenCalledWith(null, {
        token: 'abc123',
        token_type: 'bearer',
        state: expect.any(String),
      });
    });

    it('clears the hash before validating so the token never lingers in history', () => {
      const clearHash = vi.fn();
      const nonce = window.crypto.randomUUID();
      window.sessionStorage.setItem('decap-cms-auth', JSON.stringify({ nonce }));
      stubDocument({
        hash: `#access_token=abc123&state=${setState(nonce)}`,
      });
      const authenticator = new ImplicitAuthenticator({
        base_url: 'https://provider.example.com',
        auth_endpoint: 'oauth2/authorize',
        app_id: 'client-id',
        clearHash,
      });

      authenticator.completeAuth(vi.fn());

      expect(clearHash).toHaveBeenCalledTimes(1);
    });
  });
});
