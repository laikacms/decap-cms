import type { CmsCollectionState } from '@/lib/util/index';

export function hasRequiredScopes(requiredScopes?: string[], userScopes?: string[]): boolean {
  if (!requiredScopes?.length) {
    return true;
  }
  if (userScopes?.includes('admin')) {
    return true;
  }
  return requiredScopes.every(scope => userScopes?.includes(scope));
}

export function canViewCollection(collection: Pick<CmsCollectionState, 'view_scopes'>, userScopes?: string[]): boolean {
  return hasRequiredScopes(collection.view_scopes, userScopes);
}

export function isCollectionVisible(
  collection: Pick<CmsCollectionState, 'hide' | 'view_scopes'>,
  userScopes?: string[],
): boolean {
  return collection.hide !== true && canViewCollection(collection, userScopes);
}

export function canEditCollection(collection: Pick<CmsCollectionState, 'edit_scopes'>, userScopes?: string[]): boolean {
  return hasRequiredScopes(collection.edit_scopes, userScopes);
}
