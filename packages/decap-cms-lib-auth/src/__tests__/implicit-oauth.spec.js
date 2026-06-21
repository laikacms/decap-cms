import ImplicitAuthenticator from '../implicit-oauth';

const AUTH_NONCE_STORAGE_KEY = 'decap-cms-auth';

function setHash(hash) {
  window.history.replaceState(null, '', `/${hash}`);
}

function setValidNonce(nonce = 'nonce-abc') {
  window.sessionStorage.setItem(AUTH_NONCE_STORAGE_KEY, JSON.stringify({ nonce }));
  return nonce;
}

function makeAuthenticator() {
  return new ImplicitAuthenticator({
    base_url: 'https://example.com',
    auth_endpoint: 'oauth/authorize',
    app_id: 'app-id',
    clearHash: jest.fn(),
  });
}

describe('ImplicitAuthenticator.completeAuth', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setHash('');
  });

  it('returns without calling cb when hash has neither access_token nor error', () => {
    setHash('#state=something');
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.completeAuth(cb);

    expect(cb).not.toHaveBeenCalled();
  });

  it('calls cb(Error("Invalid nonce")) when the stored nonce does not match', () => {
    setValidNonce('stored-nonce');
    const state = JSON.stringify({ nonce: 'wrong-nonce' });
    setHash(`#access_token=tok&state=${encodeURIComponent(state)}`);
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.completeAuth(cb);

    expect(cb).toHaveBeenCalledWith(new Error('Invalid nonce'));
  });

  it('calls cb(Error("Invalid nonce")) when no nonce is stored in sessionStorage', () => {
    // sessionStorage is empty — validateNonce returns false regardless of what is in the hash
    const state = JSON.stringify({ nonce: 'any-nonce' });
    setHash(`#access_token=tok&state=${encodeURIComponent(state)}`);
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.completeAuth(cb);

    expect(cb).toHaveBeenCalledWith(new Error('Invalid nonce'));
  });

  it('calls cb(Error("access_denied: Denied")) when error hash param is set', () => {
    const nonce = setValidNonce();
    const state = JSON.stringify({ nonce });
    setHash(`#error=access_denied&error_description=Denied&state=${encodeURIComponent(state)}`);
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.completeAuth(cb);

    expect(cb).toHaveBeenCalledWith(new Error('access_denied: Denied'));
  });

  it('calls cb(null, { token, ...data }) when access_token is set and nonce is valid', () => {
    const nonce = setValidNonce();
    const state = JSON.stringify({ nonce });
    setHash(`#access_token=my-token&token_type=bearer&state=${encodeURIComponent(state)}`);
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.completeAuth(cb);

    expect(cb).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ token: 'my-token', token_type: 'bearer' }),
    );
    expect(cb.mock.calls[0][0]).toBeNull();
  });

  it('calls clearHash when hash contains a recognised param', () => {
    const nonce = setValidNonce();
    const state = JSON.stringify({ nonce });
    setHash(`#access_token=tok&state=${encodeURIComponent(state)}`);
    const clearHash = jest.fn();
    const authenticator = new ImplicitAuthenticator({
      base_url: 'https://example.com',
      auth_endpoint: 'oauth/authorize',
      app_id: 'app-id',
      clearHash,
    });
    const cb = jest.fn();

    authenticator.completeAuth(cb);

    expect(clearHash).toHaveBeenCalled();
  });
});
