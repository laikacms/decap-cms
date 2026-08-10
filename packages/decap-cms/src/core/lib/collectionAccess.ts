import type { CmsCollectionState, CmsUser } from '@/lib/util/index';

const warnedUnknownRoles = new Set<string>();

/**
 * Effective scopes for a user: the scopes reported on the backend payload
 * plus the scopes granted by the config-defined role the user carries
 * (`config.roles`, role name to scope list). An unknown role grants nothing
 * beyond the payload scopes; it is reported once per role via console.warn
 * because it is usually a config typo or a role that was renamed.
 */
export function resolveUserScopes(
  user: Pick<CmsUser, 'scopes' | 'role'> | undefined,
  roles?: Record<string, string[]>,
): string[] {
  const payloadScopes = user?.scopes ?? [];
  if (!user?.role || !roles) {
    return payloadScopes;
  }
  const roleScopes = roles[user.role];
  if (!roleScopes) {
    if (!warnedUnknownRoles.has(user.role)) {
      warnedUnknownRoles.add(user.role);
      console.warn(`User role '${user.role}' is not defined in config.roles; it grants no scopes.`);
    }
    return payloadScopes;
  }
  return [...new Set([...payloadScopes, ...roleScopes])];
}

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
