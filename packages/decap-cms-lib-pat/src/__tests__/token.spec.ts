import {
  TOKEN_PREFIX,
  generateToken,
  hashToken,
  hashesEqual,
  isPatToken,
  mintPersonalAccessToken,
  tokenPreview,
} from '../token';

describe('generateToken', () => {
  it('is prefixed with lk_pat_', () => {
    expect(generateToken()).toMatch(new RegExp(`^${TOKEN_PREFIX}`));
  });

  it('produces unique, high-entropy tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(tokens.size).toBe(200);
  });

  it('only uses url/shell-safe characters after the prefix', () => {
    const secret = generateToken().slice(TOKEN_PREFIX.length);
    expect(secret).toMatch(/^[A-Za-z0-9]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });
});

describe('isPatToken', () => {
  it('recognizes PAT-prefixed bearers', () => {
    expect(isPatToken(generateToken())).toBe(true);
  });

  it('rejects non-PAT bearers', () => {
    expect(isPatToken('eyJhbGciOiJIUzI1NiJ9.session.token')).toBe(false);
    expect(isPatToken('')).toBe(false);
  });
});

describe('hashToken', () => {
  it('is deterministic', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('is a 64-char hex sha256 digest', () => {
    expect(hashToken('lk_pat_abc')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('never stores or reveals the plaintext secret', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).not.toContain(token);
    expect(hash).not.toBe(token);
  });

  it('two different tokens hash differently', () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
  });
});

describe('hashesEqual', () => {
  it('matches equal hashes in constant time', () => {
    const h = hashToken('lk_pat_same');
    expect(hashesEqual(h, h)).toBe(true);
  });

  it('rejects differing hashes, including different lengths', () => {
    expect(hashesEqual(hashToken('a'), hashToken('b'))).toBe(false);
    expect(hashesEqual('ab', 'abcd')).toBe(false);
  });
});

describe('tokenPreview', () => {
  it('truncates to a short, non-secret preview', () => {
    const token = generateToken();
    const preview = tokenPreview(token);
    expect(preview.length).toBeLessThan(token.length);
    expect(preview.startsWith(TOKEN_PREFIX)).toBe(true);
  });
});

describe('mintPersonalAccessToken', () => {
  const deps = { generateId: () => 'pat_123', now: () => new Date('2026-01-01T00:00:00.000Z') };

  it('mints a token and a matching, hash-only record', () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'user_1', scopes: ['content:read'] },
      deps,
    );

    expect(token).toMatch(new RegExp(`^${TOKEN_PREFIX}`));
    expect(record.id).toBe('pat_123');
    expect(record.userId).toBe('user_1');
    expect(record.scopes).toEqual(['content:read']);
    expect(record.tokenHash).toBe(hashToken(token));
    expect(record.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(record.revokedAt).toBeNull();
    expect(record.lastUsedAt).toBeNull();
  });

  it('never puts the plaintext token on the record', () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'user_1', scopes: ['admin'] },
      deps,
    );
    expect(JSON.stringify(record)).not.toContain(token);
  });

  it('collapses a widened scope set down to just admin', () => {
    const { record } = mintPersonalAccessToken(
      { userId: 'user_1', scopes: ['admin', 'content:read'] },
      deps,
    );
    expect(record.scopes).toEqual(['admin']);
  });

  it('carries through an explicit expiry', () => {
    const { record } = mintPersonalAccessToken(
      { userId: 'user_1', scopes: ['content:read'], expiresAt: '2026-06-01T00:00:00.000Z' },
      deps,
    );
    expect(record.expiresAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('rejects an empty scope set', () => {
    expect(() => mintPersonalAccessToken({ userId: 'user_1', scopes: [] }, deps)).toThrow(
      /at least one scope/i,
    );
  });
});
