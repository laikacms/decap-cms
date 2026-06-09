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
