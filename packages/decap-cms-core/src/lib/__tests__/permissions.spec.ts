import { BUILTIN_ROLES, hasScope, resolveUserScopes, scopeAllows, userCanPerform } from '../permissions';

describe('permissions', () => {
  describe('BUILTIN_ROLES', () => {
    it('defines admin, editor, and contributor', () => {
      expect(Object.keys(BUILTIN_ROLES).sort()).toEqual(['admin', 'contributor', 'editor']);
    });

    it('admin holds the blanket admin scope', () => {
      expect(BUILTIN_ROLES.admin).toEqual(['admin']);
    });
  });

  describe('resolveUserScopes', () => {
    it('returns undefined when the user has no role', () => {
      expect(resolveUserScopes({}, undefined)).toBeUndefined();
      expect(resolveUserScopes(undefined, undefined)).toBeUndefined();
    });

    it('resolves a built-in role by name', () => {
      expect(resolveUserScopes({ role: 'editor' }, undefined)).toEqual(BUILTIN_ROLES.editor);
    });

    it('returns undefined for an unknown role name', () => {
      expect(resolveUserScopes({ role: 'nonexistent' }, undefined)).toBeUndefined();
    });

    it('merges config.roles over the built-ins, allowing overrides and additions', () => {
      const config = {
        roles: {
          contributor: ['content:read'], // override: drop content:write
          reviewer: ['content:read', 'content:write'], // addition
        },
      };
      expect(resolveUserScopes({ role: 'contributor' }, config)).toEqual(['content:read']);
      expect(resolveUserScopes({ role: 'reviewer' }, config)).toEqual([
        'content:read',
        'content:write',
      ]);
      // built-ins not overridden survive the merge
      expect(resolveUserScopes({ role: 'admin' }, config)).toEqual(['admin']);
    });
  });

  describe('hasScope', () => {
    it('is false when scopes is undefined', () => {
      expect(hasScope(undefined, 'content:write')).toBe(false);
    });

    it('is true when the exact scope is present', () => {
      expect(hasScope(['content:read', 'content:write'], 'content:write')).toBe(true);
    });

    it('is false when the scope is absent', () => {
      expect(hasScope(['content:read'], 'content:write')).toBe(false);
    });

    it('the admin scope satisfies any requirement', () => {
      expect(hasScope(['admin'], 'config:write')).toBe(true);
    });
  });

  describe('scopeAllows', () => {
    it('is true when no scope is required, regardless of scopes', () => {
      expect(scopeAllows(undefined, undefined)).toBe(true);
      expect(scopeAllows([], undefined)).toBe(true);
    });

    it('defers to hasScope when a scope is required', () => {
      expect(scopeAllows(['content:write'], 'content:write')).toBe(true);
      expect(scopeAllows(undefined, 'content:write')).toBe(false);
    });
  });

  describe('userCanPerform', () => {
    it('allows unconditionally when the collection has no scope requirement', () => {
      expect(userCanPerform(undefined, undefined, undefined)).toBe(true);
      expect(userCanPerform(undefined, { role: 'contributor' }, undefined)).toBe(true);
    });

    it('denies when a scope is required and the user has no role', () => {
      expect(userCanPerform('content:write', undefined, undefined)).toBe(false);
      expect(userCanPerform('content:write', {}, undefined)).toBe(false);
    });

    it('allows when the resolved role grants the required scope', () => {
      expect(userCanPerform('content:write', { role: 'editor' }, undefined)).toBe(true);
      expect(userCanPerform('media:write', { role: 'contributor' }, undefined)).toBe(false);
    });

    it('honors a custom role from config.roles', () => {
      const config = { roles: { 'shop-manager': ['shop.catalog:write'] } };
      expect(userCanPerform('shop.catalog:write', { role: 'shop-manager' }, config)).toBe(true);
      expect(userCanPerform('shop.catalog:read', { role: 'shop-manager' }, config)).toBe(false);
    });

    it('admin role satisfies any required scope', () => {
      expect(userCanPerform('config:write', { role: 'admin' }, undefined)).toBe(true);
    });
  });
});
