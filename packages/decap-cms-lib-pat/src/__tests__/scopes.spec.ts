import {
  ADMIN_SCOPE,
  ALL_SCOPES,
  GRANULAR_SCOPES,
  expandScopes,
  hasScope,
  isScope,
} from '../scopes';

describe('scopes', () => {
  it('lists all granular scopes plus admin in ALL_SCOPES', () => {
    expect(ALL_SCOPES).toEqual([...GRANULAR_SCOPES, ADMIN_SCOPE]);
  });

  it('isScope validates known scopes only', () => {
    expect(isScope('content:read')).toBe(true);
    expect(isScope('admin')).toBe(true);
    expect(isScope('content:delete')).toBe(false);
    expect(isScope('')).toBe(false);
  });

  describe('expandScopes', () => {
    it('expands admin into every granular scope', () => {
      const expanded = expandScopes([ADMIN_SCOPE]);
      expect(expanded).toEqual(expect.arrayContaining([ADMIN_SCOPE, ...GRANULAR_SCOPES]));
      expect(expanded).toHaveLength(GRANULAR_SCOPES.length + 1);
    });

    it('deduplicates granular scopes without admin', () => {
      const expanded = expandScopes(['content:read', 'content:read', 'media:write']);
      expect(expanded.sort()).toEqual(['content:read', 'media:write'].sort());
    });
  });

  describe('hasScope', () => {
    it('admin satisfies any required scope', () => {
      expect(hasScope([ADMIN_SCOPE], 'content:write')).toBe(true);
      expect(hasScope([ADMIN_SCOPE], 'config:read')).toBe(true);
    });

    it('a granular grant only satisfies itself', () => {
      expect(hasScope(['content:read'], 'content:read')).toBe(true);
      expect(hasScope(['content:read'], 'content:write')).toBe(false);
    });

    it('an empty grant satisfies nothing', () => {
      expect(hasScope([], 'content:read')).toBe(false);
    });
  });
});
