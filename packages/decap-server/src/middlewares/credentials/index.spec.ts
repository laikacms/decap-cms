import { resolveCredentialRequest, envCredentialLookup } from '.';

describe('credentials middleware', () => {
  describe('resolveCredentialRequest', () => {
    const expectedToken = 'server-secret-token';
    function lookup(name: string) {
      return name === 'known_key' ? 'the-value' : undefined;
    }

    it('returns 503 when no server token is configured, without checking the request at all', () => {
      const result = resolveCredentialRequest(
        { authorization: 'Bearer anything', name: 'known_key', expectedToken: undefined },
        lookup,
      );
      expect(result).toEqual({
        status: 503,
        body: { error: 'Credential store is not configured' },
      });
    });

    it('rejects a missing Authorization header', () => {
      const result = resolveCredentialRequest(
        { authorization: undefined, name: 'known_key', expectedToken },
        lookup,
      );
      expect(result.status).toBe(401);
    });

    it('rejects a non-bearer Authorization scheme', () => {
      const result = resolveCredentialRequest(
        { authorization: `Basic ${expectedToken}`, name: 'known_key', expectedToken },
        lookup,
      );
      expect(result.status).toBe(401);
    });

    it('rejects an incorrect bearer token', () => {
      const result = resolveCredentialRequest(
        { authorization: 'Bearer wrong-token', name: 'known_key', expectedToken },
        lookup,
      );
      expect(result.status).toBe(401);
    });

    it('rejects a request missing the "name" parameter, even with a valid token', () => {
      const result = resolveCredentialRequest(
        { authorization: `Bearer ${expectedToken}`, name: undefined, expectedToken },
        lookup,
      );
      expect(result).toEqual({ status: 400, body: { error: 'Missing "name" query parameter' } });
    });

    it('returns 404 (not the underlying "unset" vs "unknown" distinction) for an unresolvable name', () => {
      const result = resolveCredentialRequest(
        { authorization: `Bearer ${expectedToken}`, name: 'nope', expectedToken },
        lookup,
      );
      expect(result).toEqual({ status: 404, body: { error: 'Credential not found' } });
    });

    it('returns the value for a valid, authorized request', () => {
      const result = resolveCredentialRequest(
        { authorization: `Bearer ${expectedToken}`, name: 'known_key', expectedToken },
        lookup,
      );
      expect(result).toEqual({ status: 200, body: { value: 'the-value' } });
    });
  });

  describe('envCredentialLookup', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('reads a credential from its normalized DECAP_CREDENTIAL_* env var', () => {
      process.env.DECAP_CREDENTIAL_STOCK_PHOTO_API_KEY = 'env-value';
      expect(envCredentialLookup('stock_photo_api_key')).toBe('env-value');
    });

    it('normalizes non-alphanumeric characters in the credential name', () => {
      process.env.DECAP_CREDENTIAL_DEPLOY_HOOK_URL = 'https://example.com/hooks/deploy';
      expect(envCredentialLookup('deploy-hook.url')).toBe('https://example.com/hooks/deploy');
    });

    it('returns undefined for an unset credential', () => {
      expect(envCredentialLookup('never_set')).toBeUndefined();
    });
  });
});
