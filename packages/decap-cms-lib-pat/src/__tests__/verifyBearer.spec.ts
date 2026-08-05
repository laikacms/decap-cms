import { describe, expect, it, vi } from 'vitest';

import { hashToken, mintPersonalAccessToken } from '../token.js';
import { resolveBearer } from '../verifyBearer.js';

import type { PatRecord } from '../types.js';

const NOW = new Date('2026-03-01T00:00:00.000Z');

function makeStore(records: PatRecord[]) {
  return async (hash: string) => records.find(r => r.tokenHash === hash) ?? null;
}

describe('resolveBearer', () => {
  it('returns null for an empty/missing bearer', async () => {
    const ctx = await resolveBearer(undefined, {
      verifySessionToken: async () => ({ user: { id: 'u1' } }),
      lookupPatByHash: async () => null,
    });
    expect(ctx).toBeNull();
  });

  it('resolves a session token to full (admin-expanded) scopes', async () => {
    const ctx = await resolveBearer('session-token-abc', {
      verifySessionToken: async bearer =>
        bearer === 'session-token-abc' ? { user: { id: 'u1' } } : null,
      lookupPatByHash: async () => null,
    });

    expect(ctx).toEqual({
      user: { id: 'u1' },
      scopes: expect.arrayContaining(['admin', 'content:read', 'content:write']),
      tokenType: 'session',
    });
  });

  it('returns null for an invalid session token', async () => {
    const ctx = await resolveBearer('garbage', {
      verifySessionToken: async () => null,
      lookupPatByHash: async () => null,
    });
    expect(ctx).toBeNull();
  });

  it('resolves a valid PAT to its granted scope subset', async () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'agent_1', scopes: ['content:read', 'media:read'] },
      { generateId: () => 'pat_1', now: () => NOW },
    );

    const ctx = await resolveBearer(token, {
      verifySessionToken: async () => null,
      lookupPatByHash: makeStore([record]),
      now: () => NOW,
    });

    expect(ctx).toEqual({
      user: { id: 'agent_1' },
      scopes: expect.arrayContaining(['content:read', 'media:read']),
      tokenType: 'pat',
      patId: 'pat_1',
    });
    expect(ctx?.scopes).not.toContain('admin');
    expect(ctx?.scopes).not.toContain('content:write');
  });

  it('never calls verifySessionToken for a PAT-shaped bearer', async () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'agent_1', scopes: ['content:read'] },
      { generateId: () => 'pat_1', now: () => NOW },
    );
    const verifySessionToken = vi.fn();

    await resolveBearer(token, {
      verifySessionToken,
      lookupPatByHash: makeStore([record]),
      now: () => NOW,
    });

    expect(verifySessionToken).not.toHaveBeenCalled();
  });

  it('rejects an unknown PAT', async () => {
    const ctx = await resolveBearer('lk_pat_doesnotexist', {
      verifySessionToken: async () => null,
      lookupPatByHash: async () => null,
    });
    expect(ctx).toBeNull();
  });

  it('rejects a revoked PAT', async () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'agent_1', scopes: ['content:read'] },
      { generateId: () => 'pat_1', now: () => NOW },
    );
    record.revokedAt = '2026-02-15T00:00:00.000Z';

    const ctx = await resolveBearer(token, {
      verifySessionToken: async () => null,
      lookupPatByHash: makeStore([record]),
      now: () => NOW,
    });
    expect(ctx).toBeNull();
  });

  it('rejects an expired PAT', async () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'agent_1', scopes: ['content:read'], expiresAt: '2026-01-01T00:00:00.000Z' },
      { generateId: () => 'pat_1', now: () => NOW },
    );

    const ctx = await resolveBearer(token, {
      verifySessionToken: async () => null,
      lookupPatByHash: makeStore([record]),
      now: () => NOW,
    });
    expect(ctx).toBeNull();
  });

  it('accepts a PAT that expires strictly in the future', async () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'agent_1', scopes: ['content:read'], expiresAt: '2026-12-01T00:00:00.000Z' },
      { generateId: () => 'pat_1', now: () => NOW },
    );

    const ctx = await resolveBearer(token, {
      verifySessionToken: async () => null,
      lookupPatByHash: makeStore([record]),
      now: () => NOW,
    });
    expect(ctx).not.toBeNull();
  });

  it('fires onPatUsed with the resolved record but does not fail verification if it throws', async () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'agent_1', scopes: ['content:read'] },
      { generateId: () => 'pat_1', now: () => NOW },
    );
    const onPatUsed = vi.fn(async () => {
      throw new Error('storage down');
    });

    const ctx = await resolveBearer(token, {
      verifySessionToken: async () => null,
      lookupPatByHash: makeStore([record]),
      now: () => NOW,
      onPatUsed,
    });

    expect(ctx).not.toBeNull();
    expect(onPatUsed).toHaveBeenCalledWith(record);
  });

  it('looks PATs up by hash only, never by plaintext token', async () => {
    const { token, record } = mintPersonalAccessToken(
      { userId: 'agent_1', scopes: ['content:read'] },
      { generateId: () => 'pat_1', now: () => NOW },
    );
    const lookupPatByHash = vi.fn(async (hash: string) =>
      hash === hashToken(token) ? record : null,
    );

    await resolveBearer(token, {
      verifySessionToken: async () => null,
      lookupPatByHash,
      now: () => NOW,
    });

    expect(lookupPatByHash).toHaveBeenCalledWith(hashToken(token));
    expect(lookupPatByHash.mock.calls[0][0]).not.toBe(token);
  });
});
