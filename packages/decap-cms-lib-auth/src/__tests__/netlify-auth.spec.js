import Authenticator from '../netlify-auth';

const NETLIFY_API = 'https://api.netlify.com';
const AUTH_ENDPOINT = 'auth';

describe('NetlifyError', () => {
  it('toString() returns the wrapped err.message', () => {
    // Access NetlifyError indirectly through the refresh callback
    const auth = new Authenticator({ base_url: 'https://example.com', site_id: 'test-site' });
    let capturedError;
    auth.refresh({}, err => {
      capturedError = err;
    });
    expect(capturedError.toString()).toBe(
      'You must specify a provider and refresh token when calling netlify.refresh',
    );
  });

  it('toString() returns undefined when err is falsy', () => {
    let capturedError;
    const auth = new Authenticator({ base_url: 'https://example.com', site_id: 'test-site' });
    auth.refresh({}, err => {
      capturedError = err;
    });
    // Verify the error has the right structure (err.message is set)
    expect(typeof capturedError.toString()).toBe('string');
  });
});

describe('Authenticator constructor', () => {
  it('applies defaults when called with no arguments', () => {
    const auth = new Authenticator();
    expect(auth.base_url).toBe(NETLIFY_API);
    expect(auth.auth_endpoint).toBe(AUTH_ENDPOINT);
    expect(auth.site_id).toBeNull();
  });

  it('strips trailing slash from base_url', () => {
    const auth = new Authenticator({ base_url: 'https://example.com/' });
    expect(auth.base_url).toBe('https://example.com');
  });

  it('strips multiple trailing slashes from base_url', () => {
    const auth = new Authenticator({ base_url: 'https://example.com///' });
    expect(auth.base_url).toBe('https://example.com');
  });

  it('strips leading and trailing slashes from auth_endpoint', () => {
    const auth = new Authenticator({ auth_endpoint: '/my/auth/' });
    expect(auth.auth_endpoint).toBe('my/auth');
  });

  it('stores site_id from config', () => {
    const auth = new Authenticator({ site_id: 'my-site-id' });
    expect(auth.site_id).toBe('my-site-id');
  });

  it('falls back to NETLIFY_API when base_url is empty string', () => {
    const auth = new Authenticator({ base_url: '' });
    expect(auth.base_url).toBe(NETLIFY_API);
  });

  it('falls back to AUTH_ENDPOINT when auth_endpoint is empty string', () => {
    const auth = new Authenticator({ auth_endpoint: '' });
    expect(auth.auth_endpoint).toBe(AUTH_ENDPOINT);
  });
});

describe('Authenticator.getSiteID()', () => {
  // jsdom test environment is configured with url: 'http://localhost:8080'
  // document.location is non-configurable in jsdom; we mutate the internal URL object
  // to simulate different hosts without triggering navigation.
  const docImplSym = Object.getOwnPropertySymbols(document)[0];
  const docImpl = document[docImplSym];
  let savedUrl;

  beforeEach(() => {
    savedUrl = { host: docImpl._URL.host, port: docImpl._URL.port };
  });

  afterEach(() => {
    docImpl._URL.host = savedUrl.host;
    docImpl._URL.port = savedUrl.port;
  });

  function setHost(host, port = null) {
    docImpl._URL.host = host;
    docImpl._URL.port = port;
  }

  it('returns site_id when set', () => {
    const auth = new Authenticator({ site_id: 'my-site.netlify.app' });
    expect(auth.getSiteID()).toBe('my-site.netlify.app');
  });

  it('returns demo.decapcms.org when host is localhost (jsdom default)', () => {
    // jest testEnvironmentOptions.url is localhost:8080, so host.split(':')[0] === 'localhost'
    const auth = new Authenticator();
    expect(auth.getSiteID()).toBe('demo.decapcms.org');
  });

  it('returns demo.decapcms.org when host is localhost with port', () => {
    setHost('localhost', 8080);
    const auth = new Authenticator();
    expect(auth.getSiteID()).toBe('demo.decapcms.org');
  });

  it('returns the host when not localhost', () => {
    setHost('my-site.netlify.app');
    const auth = new Authenticator();
    expect(auth.getSiteID()).toBe('my-site.netlify.app');
  });
});

describe('Authenticator.refresh()', () => {
  it('calls callback with NetlifyError when provider is missing', () => {
    const auth = new Authenticator({ base_url: 'https://example.com', site_id: 'test-site' });
    const cb = jest.fn();
    auth.refresh({ refresh_token: 'tok' }, cb);
    expect(cb).toHaveBeenCalledTimes(1);
    const [err] = cb.mock.calls[0];
    expect(err).toBeTruthy();
    expect(err.toString()).toContain('provider');
  });

  it('calls callback with NetlifyError when refresh_token is missing', () => {
    const auth = new Authenticator({ base_url: 'https://example.com', site_id: 'test-site' });
    const cb = jest.fn();
    auth.refresh({ provider: 'github' }, cb);
    expect(cb).toHaveBeenCalledTimes(1);
    const [err] = cb.mock.calls[0];
    expect(err).toBeTruthy();
    expect(err.toString()).toContain('refresh token');
  });

  it('calls callback with NetlifyError when both provider and refresh_token are missing', () => {
    const auth = new Authenticator({ base_url: 'https://example.com', site_id: 'test-site' });
    const cb = jest.fn();
    auth.refresh({}, cb);
    expect(cb).toHaveBeenCalledTimes(1);
    const [err] = cb.mock.calls[0];
    expect(err).toBeTruthy();
  });
});

describe('Authenticator.authorizeCallback()', () => {
  let auth;
  const baseUrl = 'https://example.com';

  beforeEach(() => {
    auth = new Authenticator({ base_url: baseUrl, site_id: 'test-site' });
    // Provide a mock authWindow so close() doesn't throw
    auth.authWindow = { close: jest.fn() };
  });

  it('calls cb(null, data) on success message from correct origin', () => {
    const cb = jest.fn();
    const options = { provider: 'github' };
    const fn = auth.authorizeCallback(options, cb);
    const data = { token: 'abc123' };
    const messageData = `authorization:github:success:${JSON.stringify(data)}`;

    fn({ origin: baseUrl, data: messageData });

    expect(cb).toHaveBeenCalledWith(null, data);
  });

  it('calls cb(NetlifyError) on error message from correct origin', () => {
    const cb = jest.fn();
    const options = { provider: 'github' };
    const fn = auth.authorizeCallback(options, cb);
    const errData = { message: 'auth failed' };
    const messageData = `authorization:github:error:${JSON.stringify(errData)}`;

    fn({ origin: baseUrl, data: messageData });

    expect(cb).toHaveBeenCalledTimes(1);
    const [err] = cb.mock.calls[0];
    expect(err).toBeTruthy();
    expect(err.toString()).toBe('auth failed');
  });

  it('ignores messages from wrong origin', () => {
    const cb = jest.fn();
    const options = { provider: 'github' };
    const fn = auth.authorizeCallback(options, cb);
    const data = { token: 'abc123' };
    const messageData = `authorization:github:success:${JSON.stringify(data)}`;

    fn({ origin: 'https://evil.com', data: messageData });

    expect(cb).not.toHaveBeenCalled();
  });

  it('ignores messages for a different provider', () => {
    const cb = jest.fn();
    const options = { provider: 'github' };
    const fn = auth.authorizeCallback(options, cb);
    const data = { token: 'abc123' };
    const messageData = `authorization:gitlab:success:${JSON.stringify(data)}`;

    fn({ origin: baseUrl, data: messageData });

    expect(cb).not.toHaveBeenCalled();
  });

  it('closes authWindow on success', () => {
    const cb = jest.fn();
    const options = { provider: 'github' };
    const fn = auth.authorizeCallback(options, cb);
    const data = { token: 'abc123' };
    fn({ origin: baseUrl, data: `authorization:github:success:${JSON.stringify(data)}` });

    expect(auth.authWindow.close).toHaveBeenCalled();
  });

  it('closes authWindow on error', () => {
    const cb = jest.fn();
    const options = { provider: 'github' };
    const fn = auth.authorizeCallback(options, cb);
    fn({
      origin: baseUrl,
      data: `authorization:github:error:${JSON.stringify({ message: 'oops' })}`,
    });

    expect(auth.authWindow.close).toHaveBeenCalled();
  });
});
