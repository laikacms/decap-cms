import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNonce, isInsecureProtocol, validateNonce } from '@/lib/auth/utils';

describe('createNonce', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('returns a nonce string', () => {
    const nonce = createNonce();

    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('writes the returned nonce to sessionStorage', () => {
    const nonce = createNonce();

    const stored = window.sessionStorage.getItem('decap-cms-auth');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toEqual({ nonce });
  });

  it('generates a different nonce on each call', () => {
    const first = createNonce();
    const second = createNonce();

    expect(first).not.toBe(second);
  });
});

describe('validateNonce', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('returns true when the check value matches the stored nonce', () => {
    const nonce = createNonce();

    expect(validateNonce(nonce)).toBe(true);
  });

  it('returns false when the check value does not match the stored nonce', () => {
    createNonce();

    expect(validateNonce('some-other-nonce')).toBe(false);
  });

  it('returns false when no nonce has been stored', () => {
    expect(validateNonce('any-nonce')).toBe(false);
  });

  it('consumes the stored nonce so a replayed check cannot validate twice', () => {
    // laika-cloud#1735: validateNonce used to clear only localStorage, while
    // createNonce writes to sessionStorage - so the nonce survived validation
    // and a replayed OAuth callback URL validated again.
    const nonce = createNonce();

    expect(validateNonce(nonce)).toBe(true);
    expect(validateNonce(nonce)).toBe(false);
    expect(window.sessionStorage.getItem('decap-cms-auth')).toBeNull();
  });

  it('clears the decap-cms-auth key from localStorage as a side effect', () => {
    window.localStorage.setItem('decap-cms-auth', JSON.stringify({ nonce: 'leftover' }));
    const nonce = createNonce();

    validateNonce(nonce);

    expect(window.localStorage.getItem('decap-cms-auth')).toBeNull();
  });
});

describe('isInsecureProtocol', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubLocation(protocol: string, hostname: string): void {
    vi.stubGlobal('document', { location: { protocol, hostname } });
  }

  it('returns true for http on a non-localhost hostname', () => {
    stubLocation('http:', 'example.com');

    expect(isInsecureProtocol()).toBe(true);
  });

  it('returns false for https on a non-localhost hostname', () => {
    stubLocation('https:', 'example.com');

    expect(isInsecureProtocol()).toBe(false);
  });

  it('returns false for http on localhost', () => {
    stubLocation('http:', 'localhost');

    expect(isInsecureProtocol()).toBe(false);
  });

  it('returns false for http on 127.0.0.1', () => {
    stubLocation('http:', '127.0.0.1');

    expect(isInsecureProtocol()).toBe(false);
  });

  it('returns false for https on localhost', () => {
    stubLocation('https:', 'localhost');

    expect(isInsecureProtocol()).toBe(false);
  });
});
