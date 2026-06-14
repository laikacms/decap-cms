import { createNonce, validateNonce, isInsecureProtocol } from '../utils';

describe('auth utils', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('should validate and clear nonce from session storage', () => {
    const nonce = createNonce();

    expect(validateNonce(nonce)).toBe(true);
    expect(window.sessionStorage.getItem('decap-cms-auth')).toBeNull();
  });

  it('should not clear local storage nonce key', () => {
    window.localStorage.setItem('decap-cms-auth', 'local-only');
    const nonce = createNonce();

    validateNonce(nonce);

    expect(window.localStorage.getItem('decap-cms-auth')).toBe('local-only');
  });
});

describe('isInsecureProtocol', () => {
  // document.location is non-configurable in jsdom; mutate the internal URL object
  // to simulate different protocols and hostnames without triggering navigation.
  const docImplSym = Object.getOwnPropertySymbols(document)[0];
  const docImpl = document[docImplSym];
  let savedUrl;

  beforeEach(() => {
    savedUrl = { scheme: docImpl._URL.scheme, host: docImpl._URL.host };
  });

  afterEach(() => {
    docImpl._URL.scheme = savedUrl.scheme;
    docImpl._URL.host = savedUrl.host;
  });

  function setLocation(protocol, hostname) {
    // protocol includes the colon, e.g. 'http:'; scheme is without colon
    docImpl._URL.scheme = protocol.replace(/:$/, '');
    docImpl._URL.host = hostname;
  }

  it('returns true when protocol is http: and hostname is not localhost or 127.0.0.1', () => {
    setLocation('http:', 'example.com');
    expect(isInsecureProtocol()).toBe(true);
  });

  it('returns false when protocol is https:', () => {
    setLocation('https:', 'example.com');
    expect(isInsecureProtocol()).toBe(false);
  });

  it('returns false when protocol is http: and hostname is localhost', () => {
    setLocation('http:', 'localhost');
    expect(isInsecureProtocol()).toBe(false);
  });

  it('returns false when protocol is http: and hostname is 127.0.0.1', () => {
    setLocation('http:', '127.0.0.1');
    expect(isInsecureProtocol()).toBe(false);
  });
});
