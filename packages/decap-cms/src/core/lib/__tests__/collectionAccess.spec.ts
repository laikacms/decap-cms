import { describe, expect, it } from 'vitest';

import {
  canEditCollection,
  canViewCollection,
  hasRequiredScopes,
  isCollectionVisible,
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
