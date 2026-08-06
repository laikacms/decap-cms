import { describe, expect, it } from 'vitest';

import {
  ADMIN_SCOPE,
  ALL_SCOPES,
  GRANULAR_SCOPES,
  hasScope,
  isScope,
  normalizeScopes,
  WILDCARD_SCOPE,
} from '../scopes.js';

describe('scopes', () => {
  it('lists the shipped CMS scopes plus admin in ALL_SCOPES', () => {
    expect(ALL_SCOPES).toEqual([...GRANULAR_SCOPES, ADMIN_SCOPE]);
  });

  describe('isScope', () => {
    it('accepts the global grants', () => {
      expect(isScope(ADMIN_SCOPE)).toBe(true);
      expect(isScope(WILDCARD_SCOPE)).toBe(true);
    });

    it('accepts any well-formed resource:action, including consumer namespaces', () => {
      expect(isScope('content:read')).toBe(true);
      // Open vocabulary: not a shipped scope, but structurally valid.
      expect(isScope('content:delete')).toBe(true);
      expect(isScope('shipping:read')).toBe(true);
      expect(isScope('orders:*')).toBe(true);
    });

    it('rejects structurally invalid scopes', () => {
      expect(isScope('')).toBe(false);
      expect(isScope('content')).toBe(false);
      expect(isScope(':read')).toBe(false);
      expect(isScope('content:')).toBe(false);
      expect(isScope('a:b:c')).toBe(false);
    });
  });

  describe('normalizeScopes', () => {
    it('collapses a global grant down to just admin, never enumerating', () => {
      expect(normalizeScopes([ADMIN_SCOPE, 'content:read'])).toEqual([ADMIN_SCOPE]);
      expect(normalizeScopes([WILDCARD_SCOPE])).toEqual([ADMIN_SCOPE]);
    });

    it('deduplicates a granular set without inventing scopes', () => {
      const normalized = normalizeScopes(['content:read', 'content:read', 'media:write']);
      expect(normalized.sort()).toEqual(['content:read', 'media:write'].sort());
    });

    it('preserves consumer-defined scopes verbatim', () => {
      expect(normalizeScopes(['shipping:read', 'sales:write'])).toEqual([
        'shipping:read',
        'sales:write',
      ]);
    });
  });

  describe('hasScope', () => {
    it('a global grant satisfies any required scope', () => {
      expect(hasScope([ADMIN_SCOPE], 'content:write')).toBe(true);
      expect(hasScope([ADMIN_SCOPE], 'shipping:read')).toBe(true);
      expect(hasScope([WILDCARD_SCOPE], 'anything:goes')).toBe(true);
    });

    it('an exact grant only satisfies itself', () => {
      expect(hasScope(['content:read'], 'content:read')).toBe(true);
      expect(hasScope(['content:read'], 'content:write')).toBe(false);
    });

    it('a resource:* grant satisfies any action on that resource', () => {
      expect(hasScope(['content:*'], 'content:read')).toBe(true);
      expect(hasScope(['content:*'], 'content:write')).toBe(true);
      // ...but not other resources.
      expect(hasScope(['content:*'], 'media:read')).toBe(false);
    });

    it('works for consumer-defined namespaces', () => {
      expect(hasScope(['shipping:*'], 'shipping:read')).toBe(true);
      expect(hasScope(['sales:write'], 'sales:write')).toBe(true);
      expect(hasScope(['sales:write'], 'sales:read')).toBe(false);
    });

    it('an empty grant satisfies nothing', () => {
      expect(hasScope([], 'content:read')).toBe(false);
    });
  });
});
