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

describe('ImplicitAuthenticator.authenticate', () => {
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
  });

  afterEach(() => {
    const implSymbol = Object.getOwnPropertySymbols(document.location)[0];
    const locationImpl = document.location[implSymbol];
    if (locationImpl && locationImpl.__origNavigate__) {
      locationImpl._locationObjectNavigate = locationImpl.__origNavigate__;
      delete locationImpl.__origNavigate__;
    }
  });

  it('builds the authorization URL with the required params', () => {
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.authenticate({ scope: 'repo' }, cb);

    expect(cb).not.toHaveBeenCalled();
    expect(navigatedUrl).not.toBeNull();
    const url = new URL(navigatedUrl);
    expect(url.origin + url.pathname).toBe('https://example.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('app-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      document.location.origin + document.location.pathname,
    );
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('scope')).toBe('repo');
  });

  it('includes prompt in the authorization URL when provided', () => {
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.authenticate({ scope: 'repo', prompt: 'select_account' }, cb);

    const url = new URL(navigatedUrl);
    expect(url.searchParams.get('prompt')).toBe('select_account');
  });

  it('does not include prompt in the authorization URL when not provided', () => {
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.authenticate({ scope: 'repo' }, cb);

    const url = new URL(navigatedUrl);
    expect(url.searchParams.has('prompt')).toBe(false);
  });

  it('includes resource in the authorization URL when provided', () => {
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.authenticate({ scope: 'repo', resource: 'some-resource' }, cb);

    const url = new URL(navigatedUrl);
    expect(url.searchParams.get('resource')).toBe('some-resource');
  });

  it('does not include resource in the authorization URL when not provided', () => {
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.authenticate({ scope: 'repo' }, cb);

    const url = new URL(navigatedUrl);
    expect(url.searchParams.has('resource')).toBe(false);
  });

  it('sets state to valid JSON containing a nonce and stores it for later validation', () => {
    window.sessionStorage.clear();
    const authenticator = makeAuthenticator();
    const cb = jest.fn();

    authenticator.authenticate({ scope: 'repo' }, cb);

    const url = new URL(navigatedUrl);
    const state = JSON.parse(url.searchParams.get('state'));
    expect(state.auth_type).toBe('implicit');
    expect(typeof state.nonce).toBe('string');
    expect(state.nonce.length).toBeGreaterThan(0);

    // createNonce() also persists the nonce to sessionStorage so completeAuth() can validate it later
    const stored = JSON.parse(window.sessionStorage.getItem(AUTH_NONCE_STORAGE_KEY));
    expect(stored.nonce).toBe(state.nonce);
  });

  it('calls cb(Error) and does not navigate when the protocol is insecure', () => {
    const docImplSym = Object.getOwnPropertySymbols(document)[0];
    const docImpl = document[docImplSym];
    const savedHost = docImpl._URL.host;
    const savedProtocol = docImpl._URL.protocol;
    docImpl._URL.protocol = 'http:';
    docImpl._URL.host = 'insecure.example.com';

    try {
      const authenticator = makeAuthenticator();
      const cb = jest.fn();

      authenticator.authenticate({ scope: 'repo' }, cb);

      expect(cb).toHaveBeenCalledWith(new Error('Cannot authenticate over insecure protocol!'));
      expect(navigatedUrl).toBeNull();
    } finally {
      docImpl._URL.protocol = savedProtocol;
      docImpl._URL.host = savedHost;
    }
  });
});

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
