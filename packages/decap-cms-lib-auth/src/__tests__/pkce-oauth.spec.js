import PkceAuthenticator from '../pkce-oauth';

const CODE_VERIFIER_STORAGE_KEY = 'decap-cms-pkce-verifier-code';
const AUTH_NONCE_STORAGE_KEY = 'decap-cms-auth';

function setAuthCallbackUrl(query) {
  window.history.replaceState(null, '', `/${query}`);
}

function setValidNonce(nonce = 'nonce-123') {
  window.sessionStorage.setItem(AUTH_NONCE_STORAGE_KEY, JSON.stringify({ nonce }));
  return nonce;
}

describe('PkceAuthenticator', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    setAuthCallbackUrl('');
  });

  describe('authenticate', () => {
    let navigatedUrl;

    beforeEach(() => {
      navigatedUrl = null;
      // jsdom stores the Location impl on document.location via a unique Symbol.
      // We can retrieve the impl without importing jsdom's utils (which has module-cache issues in Jest)
      // by using Object.getOwnPropertySymbols — there is exactly one Symbol on the wrapper.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { serializeURL } = require('whatwg-url');
      const implSymbol = Object.getOwnPropertySymbols(document.location)[0];
      const locationImpl = document.location[implSymbol];
      const origNavigate = locationImpl._locationObjectNavigate;
      locationImpl._locationObjectNavigate = function interceptedNavigate(urlRecord) {
        navigatedUrl = typeof urlRecord === 'string' ? urlRecord : serializeURL(urlRecord);
      };
      locationImpl.__origNavigate__ = origNavigate;

      // jsdom does not implement window.crypto — provide minimal stubs
      Object.defineProperty(window, 'crypto', {
        value: {
          getRandomValues(buf) {
            for (let i = 0; i < buf.length; i++) buf[i] = i % 256;
            return buf;
          },
          subtle: {
            digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(1).buffer),
          },
        },
        writable: true,
        configurable: true,
      });
      // jsdom may not provide TextEncoder — polyfill if needed
      if (typeof global.TextEncoder === 'undefined') {
        const { TextEncoder: NodeTextEncoder } = require('util');
        global.TextEncoder = NodeTextEncoder;
      }
    });

    afterEach(() => {
      jest.restoreAllMocks();
      const implSymbol = Object.getOwnPropertySymbols(document.location)[0];
      const locationImpl = document.location[implSymbol];
      if (locationImpl && locationImpl.__origNavigate__) {
        locationImpl._locationObjectNavigate = locationImpl.__origNavigate__;
        delete locationImpl.__origNavigate__;
      }
    });

    function makeAuthenticator() {
      return new PkceAuthenticator({
        use_oidc: false,
        base_url: 'https://idp.example.com',
        auth_endpoint: 'oauth2/authorize',
        auth_token_endpoint: 'oauth2/token',
        auth_token_endpoint_content_type: 'application/json',
        app_id: 'client-id',
      });
    }

    it('should include prompt in authorization URL when provided', async () => {
      const authenticator = makeAuthenticator();
      const cb = jest.fn();

      await authenticator.authenticate({ scope: 'openid', prompt: 'select_account' }, cb);

      expect(navigatedUrl).not.toBeNull();
      const url = new URL(navigatedUrl);
      expect(url.searchParams.get('prompt')).toBe('select_account');
    });

    it('should include resource in authorization URL when provided', async () => {
      const authenticator = makeAuthenticator();
      const cb = jest.fn();

      await authenticator.authenticate({ scope: 'openid', resource: 'some-resource' }, cb);

      expect(navigatedUrl).not.toBeNull();
      const url = new URL(navigatedUrl);
      expect(url.searchParams.get('resource')).toBe('some-resource');
    });

    it('should not include prompt in authorization URL when not provided', async () => {
      const authenticator = makeAuthenticator();
      const cb = jest.fn();

      await authenticator.authenticate({ scope: 'openid' }, cb);

      expect(navigatedUrl).not.toBeNull();
      const url = new URL(navigatedUrl);
      expect(url.searchParams.has('prompt')).toBe(false);
    });

    it('should not include resource in authorization URL when not provided', async () => {
      const authenticator = makeAuthenticator();
      const cb = jest.fn();

      await authenticator.authenticate({ scope: 'openid' }, cb);

      expect(navigatedUrl).not.toBeNull();
      const url = new URL(navigatedUrl);
      expect(url.searchParams.has('resource')).toBe(false);
    });
  });

  it('should clear code verifier when provider returns an auth error', async () => {
    const nonce = setValidNonce();
    const state = encodeURIComponent(JSON.stringify({ nonce }));
    setAuthCallbackUrl(`?error=access_denied&error_description=Denied&state=${state}`);
    window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, 'verifier');

    const authenticator = new PkceAuthenticator({
      use_oidc: false,
      base_url: 'https://example.com',
      auth_endpoint: 'authorize',
      auth_token_endpoint: 'oauth/token',
      auth_token_endpoint_content_type: 'application/json',
      app_id: 'app-id',
    });
    const cb = jest.fn();

    await authenticator.completeAuth(cb);

    expect(cb).toHaveBeenCalledWith(new Error('access_denied: Denied'));
    expect(window.sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY)).toBeNull();
  });

  it('should clear code verifier when OIDC config loading fails', async () => {
    const nonce = setValidNonce();
    const state = encodeURIComponent(JSON.stringify({ nonce }));
    setAuthCallbackUrl(`?code=auth-code&state=${state}`);
    window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, 'verifier');

    const authenticator = new PkceAuthenticator({
      use_oidc: true,
      base_url: 'https://example.com',
    });
    jest.spyOn(authenticator, '_loadOidcConfig').mockRejectedValue(new Error('OIDC failed'));
    const cb = jest.fn();

    await authenticator.completeAuth(cb);

    expect(cb).toHaveBeenCalledWith(new Error('OIDC failed'));
    expect(window.sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY)).toBeNull();
  });

  it('should send token request with JSON body when content type is application/json', async () => {
    const nonce = setValidNonce();
    const state = encodeURIComponent(JSON.stringify({ nonce }));
    setAuthCallbackUrl(`?code=auth-code-123&state=${state}`);
    window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, 'test-verifier');

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'token-abc' }),
    });
    global.fetch = mockFetch;

    const authenticator = new PkceAuthenticator({
      use_oidc: false,
      base_url: 'https://example.com',
      auth_endpoint: 'oauth2/authorize',
      auth_token_endpoint: 'oauth2/token',
      auth_token_endpoint_content_type: 'application/json',
      app_id: 'client-id',
    });
    const cb = jest.fn();

    await authenticator.completeAuth(cb);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, fetchOptions] = mockFetch.mock.calls[0];
    expect(fetchOptions.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(fetchOptions.body);
    expect(body).toMatchObject({
      client_id: 'client-id',
      code: 'auth-code-123',
      grant_type: 'authorization_code',
      code_verifier: 'test-verifier',
    });
    expect(cb).toHaveBeenCalledWith(null, expect.objectContaining({ token: 'token-abc' }));
  });

  it('should send token request with URL-encoded body when content type is application/x-www-form-urlencoded', async () => {
    const nonce = setValidNonce();
    const state = encodeURIComponent(JSON.stringify({ nonce }));
    setAuthCallbackUrl(`?code=auth-code-456&state=${state}`);
    window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, 'test-verifier-2');

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'token-xyz' }),
    });
    global.fetch = mockFetch;

    const authenticator = new PkceAuthenticator({
      use_oidc: false,
      base_url: 'https://example.com',
      auth_endpoint: 'oauth2/authorize',
      auth_token_endpoint: 'oauth2/token',
      auth_token_endpoint_content_type: 'application/x-www-form-urlencoded; charset=utf-8',
      app_id: 'client-id-2',
    });
    const cb = jest.fn();

    await authenticator.completeAuth(cb);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, fetchOptions] = mockFetch.mock.calls[0];
    expect(fetchOptions.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded; charset=utf-8',
    );
    const params = new URLSearchParams(fetchOptions.body);
    expect(params.get('client_id')).toBe('client-id-2');
    expect(params.get('code')).toBe('auth-code-456');
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code_verifier')).toBe('test-verifier-2');
    expect(cb).toHaveBeenCalledWith(null, expect.objectContaining({ token: 'token-xyz' }));
  });

  it('should use form-encoding default when auth_token_endpoint_content_type is omitted', async () => {
    const nonce = setValidNonce();
    const state = encodeURIComponent(JSON.stringify({ nonce }));
    setAuthCallbackUrl(`?code=auth-code-default&state=${state}`);
    window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, 'verifier-default');

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'token-default' }),
    });
    global.fetch = mockFetch;

    const authenticator = new PkceAuthenticator({
      use_oidc: false,
      base_url: 'https://example.com',
      auth_endpoint: 'oauth2/authorize',
      auth_token_endpoint: 'oauth2/token',
      app_id: 'client-default',
      // auth_token_endpoint_content_type intentionally omitted
    });
    const cb = jest.fn();

    await authenticator.completeAuth(cb);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, fetchOptions] = mockFetch.mock.calls[0];
    expect(fetchOptions.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded; charset=utf-8',
    );
    const params = new URLSearchParams(fetchOptions.body);
    expect(params.get('client_id')).toBe('client-default');
    expect(params.get('code')).toBe('auth-code-default');
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code_verifier')).toBe('verifier-default');
    expect(cb).toHaveBeenCalledWith(null, expect.objectContaining({ token: 'token-default' }));
  });

  describe('_loadOidcConfig', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should populate auth_url and auth_token_url from OIDC discovery', async () => {
      const authenticator = new PkceAuthenticator({
        use_oidc: true,
        base_url: 'https://idp.example.com',
        app_id: 'client-id',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            authorization_endpoint: 'https://idp.example.com/authorize',
            token_endpoint: 'https://idp.example.com/token',
          }),
      });

      await authenticator._loadOidcConfig();

      expect(fetch).toHaveBeenCalledWith(
        'https://idp.example.com/.well-known/openid-configuration',
      );
      expect(authenticator.auth_url).toBe('https://idp.example.com/authorize');
      expect(authenticator.auth_token_url).toBe('https://idp.example.com/token');
    });

    it('should ignore auth_endpoint and auth_token_endpoint when use_oidc is true', () => {
      const authenticator = new PkceAuthenticator({
        use_oidc: true,
        base_url: 'https://idp.example.com',
        auth_endpoint: 'oauth2/authorize',
        auth_token_endpoint: 'oauth2/token',
        app_id: 'client-id',
      });

      // auth_url and auth_token_url must NOT be set from the config keys
      expect(authenticator.auth_url).toBeUndefined();
      expect(authenticator.auth_token_url).toBeUndefined();
      expect(authenticator.oidc_url).toBe('https://idp.example.com');
    });

    it('should not re-fetch OIDC config when endpoints are already populated', async () => {
      const authenticator = new PkceAuthenticator({
        use_oidc: true,
        base_url: 'https://idp.example.com',
        app_id: 'client-id',
      });

      authenticator.auth_url = 'https://idp.example.com/authorize';
      authenticator.auth_token_url = 'https://idp.example.com/token';
      global.fetch = jest.fn();

      await authenticator._loadOidcConfig();

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should throw when OIDC discovery request fails (network error)', async () => {
      const authenticator = new PkceAuthenticator({
        use_oidc: true,
        base_url: 'https://idp.example.com',
        app_id: 'client-id',
      });

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(authenticator._loadOidcConfig()).rejects.toThrow(
        'Failed to load OIDC configuration',
      );
    });

    it('should throw when OIDC discovery returns a non-ok response', async () => {
      const authenticator = new PkceAuthenticator({
        use_oidc: true,
        base_url: 'https://idp.example.com',
        app_id: 'client-id',
      });

      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      await expect(authenticator._loadOidcConfig()).rejects.toThrow(
        'Bad response while getting OIDC configuration',
      );
    });

    it('should throw when OIDC discovery response is not valid JSON', async () => {
      const authenticator = new PkceAuthenticator({
        use_oidc: true,
        base_url: 'https://idp.example.com',
        app_id: 'client-id',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('bad json')),
      });

      await expect(authenticator._loadOidcConfig()).rejects.toThrow(
        'Failed to parse OIDC configuration JSON',
      );
    });

    it('should throw when OIDC discovery response is missing endpoint fields', async () => {
      const authenticator = new PkceAuthenticator({
        use_oidc: true,
        base_url: 'https://idp.example.com',
        app_id: 'client-id',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ issuer: 'https://idp.example.com' }),
      });

      await expect(authenticator._loadOidcConfig()).rejects.toThrow(
        'OIDC configuration missing endpoint fields',
      );
    });

    it('should throw when use_oidc is false and endpoints are not configured', async () => {
      const authenticator = new PkceAuthenticator({
        use_oidc: false,
        base_url: 'https://idp.example.com',
        app_id: 'client-id',
      });

      // Simulate missing oidc_url and auth_url/auth_token_url
      delete authenticator.auth_url;
      delete authenticator.auth_token_url;

      await expect(authenticator._loadOidcConfig()).rejects.toThrow('Missing auth URLs');
    });
  });

  it('should clear code verifier when nonce validation fails', async () => {
    const expectedNonce = setValidNonce('expected-nonce');
    const state = encodeURIComponent(JSON.stringify({ nonce: `${expectedNonce}-other` }));
    setAuthCallbackUrl(`?code=auth-code&state=${state}`);
    window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, 'verifier');

    const authenticator = new PkceAuthenticator({
      use_oidc: false,
      base_url: 'https://example.com',
      auth_endpoint: 'authorize',
      auth_token_endpoint: 'oauth/token',
      auth_token_endpoint_content_type: 'application/json',
      app_id: 'app-id',
    });
    const cb = jest.fn();

    await authenticator.completeAuth(cb);

    expect(cb).toHaveBeenCalledWith(new Error('Invalid nonce'));
    expect(window.sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY)).toBeNull();
  });
});
