import { describe, expect, it, vi } from 'vitest';

import {
  canEditCollection,
  canViewCollection,
  hasRequiredScopes,
  isCollectionVisible,
  resolveUserScopes,
} from '@/core/lib/collectionAccess';

describe('collection access scopes', () => {
  it('preserves access when no scopes are configured', () => {
    expect(hasRequiredScopes(undefined, undefined)).toBe(true);
    expect(canViewCollection({ view_scopes: undefined } as never, [])).toBe(true);
    expect(canEditCollection({ edit_scopes: [] } as never, [])).toBe(true);
  });

  it('requires every configured scope', () => {
    expect(hasRequiredScopes(['content:read', 'media:read'], ['content:read'])).toBe(false);
    expect(hasRequiredScopes(['content:read', 'media:read'], ['content:read', 'media:read'])).toBe(true);
  });

  it('treats admin as a universal grant', () => {
    expect(hasRequiredScopes(['content:write', 'media:write'], ['admin'])).toBe(true);
  });

  it('uses view_scopes for visibility and edit_scopes for mutations', () => {
    const collection = {
      view_scopes: ['content:read'],
      edit_scopes: ['content:write'],
    } as never;

    expect(canViewCollection(collection, ['content:read'])).toBe(true);
    expect(canEditCollection(collection, ['content:read'])).toBe(false);
    expect(canEditCollection(collection, ['content:write'])).toBe(true);
  });

  it('combines the existing hide flag with view scope visibility', () => {
    expect(isCollectionVisible({ hide: true } as never, ['admin'])).toBe(false);
    expect(
      isCollectionVisible({ hide: false, view_scopes: ['content:read'] } as never, ['content:read']),
    ).toBe(true);
  });
});

describe('resolveUserScopes', () => {
  it('returns payload scopes when the user carries no role', () => {
    expect(resolveUserScopes(undefined, { editor: ['content:write'] })).toEqual([]);
    expect(resolveUserScopes({ scopes: ['content:read'] }, { editor: ['content:write'] }))
      .toEqual(['content:read']);
  });

  it('returns payload scopes when no roles are configured', () => {
    expect(resolveUserScopes({ scopes: ['content:read'], role: 'editor' }, undefined))
      .toEqual(['content:read']);
  });

  it('unions role scopes with payload scopes without duplicates', () => {
    expect(
      resolveUserScopes(
        { scopes: ['content:read', 'media:read'], role: 'editor' },
        { editor: ['content:read', 'content:write'] },
      ),
    ).toEqual(['content:read', 'media:read', 'content:write']);
  });

  it('grants only role scopes when the payload reports none', () => {
    expect(resolveUserScopes({ scopes: undefined, role: 'editor' }, { editor: ['content:write'] }))
      .toEqual(['content:write']);
  });

  it('warns once and grants nothing extra for a role missing from config', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const user = { scopes: ['content:read'], role: 'missing-role-spec' };
      expect(resolveUserScopes(user, { editor: ['content:write'] })).toEqual(['content:read']);
      expect(resolveUserScopes(user, { editor: ['content:write'] })).toEqual(['content:read']);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        "User role 'missing-role-spec' is not defined in config.roles; it grants no scopes.",
      );
    } finally {
      warn.mockRestore();
    }
  });
});
