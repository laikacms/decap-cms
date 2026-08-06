import { describe, expect, it } from 'vitest';

// Pinning test for the README "Usage" example and the `requireScope` JSDoc
// `@example` block (DCMS-1894). Both show:
//
//   const ctx = await resolveBearer(bearer, deps);
//   if (!ctx) throw new UnauthorizedError();
//   requireScope(ctx, 'content:write');
//
// This test imports every symbol exactly as the examples do -- from the
// package entrypoint -- so it fails to compile/run if `UnauthorizedError`
// stops being exported or its shape drifts from `InsufficientScopeError`'s.
import {
  InsufficientScopeError,
  UnauthorizedError,
  requireScope,
  resolveBearer,
} from '../index.js';

describe('README/JSDoc usage example (DCMS-1894)', () => {
  it('throws a real UnauthorizedError when resolveBearer resolves to null', async () => {
    const ctx = await resolveBearer(undefined, {
      verifySessionToken: async () => null,
      lookupPatByHash: async () => null,
    });

    expect(ctx).toBeNull();
    expect(() => {
      if (!ctx) throw new UnauthorizedError();
    }).toThrow(UnauthorizedError);
  });

  it('UnauthorizedError mirrors InsufficientScopeError\'s shape (extends Error, sets name)', () => {
    const unauthorized = new UnauthorizedError();
    const insufficientScope = new InsufficientScopeError('content:write');

    expect(unauthorized).toBeInstanceOf(Error);
    expect(unauthorized.name).toBe('UnauthorizedError');
    expect(unauthorized.message).toBeTruthy();

    expect(insufficientScope).toBeInstanceOf(Error);
    expect(insufficientScope.name).toBe('InsufficientScopeError');
  });

  it('requireScope enforces scopes on a resolved context, as shown after the null-check', async () => {
    const ctx = await resolveBearer('session-token', {
      verifySessionToken: async () => ({ user: { id: 'u1' }, scopes: ['content:read'] }),
      lookupPatByHash: async () => null,
    });

    expect(ctx).not.toBeNull();
    expect(() => requireScope(ctx!, 'content:write')).toThrow(InsufficientScopeError);
    expect(() => requireScope(ctx!, 'content:read')).not.toThrow();
  });
});
