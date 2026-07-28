import type { User } from 'decap-cms-lib-util';
import type { CmsConfig, CmsScope } from '../types/redux';

/**
 * Built-in role -> scope bundles (DCMS-1405). A consumer's `config.roles`
 * (validated by `constants/configSchema.js`) is merged over these, so a site
 * can add custom roles or override a built-in one without redefining all of
 * them. Purely config-driven: nothing here reads from, or writes to, any git
 * backend's OAuth/token flow.
 */
export const BUILTIN_ROLES: Readonly<Record<string, CmsScope[]>> = Object.freeze({
  admin: ['admin'],
  editor: ['content:read', 'content:write', 'media:read', 'media:write'],
  contributor: ['content:read', 'content:write'],
});

/**
 * Resolves the scopes granted to `user` via `user.role`, looked up in
 * `config.roles` merged over `BUILTIN_ROLES`.
 *
 * Returns `undefined` when the user has no `role` assigned, or the role name
 * doesn't resolve to a known bundle — callers must treat `undefined` as "no
 * role information available", not as "no permissions" (see `hasScope`).
 */
export function resolveUserScopes(
  user: Pick<User, 'role'> | undefined,
  config: Pick<CmsConfig, 'roles'> | undefined,
): CmsScope[] | undefined {
  const role = user?.role;
  if (!role) {
    return undefined;
  }
  const roles: Record<string, CmsScope[]> = { ...BUILTIN_ROLES, ...(config?.roles ?? {}) };
  return roles[role];
}

/**
 * `true` iff `scopes` includes `required` or the blanket `'admin'` scope.
 * `scopes` being `undefined` (no role resolved) is treated as "no scopes" —
 * i.e. denied — so opting a collection into a `*_scope` requirement is a
 * real gate, not a no-op.
 */
export function hasScope(scopes: CmsScope[] | undefined, required: CmsScope): boolean {
  if (!scopes) {
    return false;
  }
  return scopes.includes('admin') || scopes.includes(required);
}

/**
 * Whether already-resolved `scopes` (e.g. from `resolveUserScopes`, cached by
 * a caller across several checks) satisfy `required`. `required` being unset
 * always passes — the collection hasn't opted into the role model.
 */
export function scopeAllows(
  scopes: CmsScope[] | undefined,
  required: CmsScope | undefined,
): boolean {
  if (!required) {
    return true;
  }
  return hasScope(scopes, required);
}

/**
 * Whether `user` may perform an action gated by `requiredScope` (one of a
 * collection's `create_scope`/`delete_scope`/`publish_scope`). When
 * `requiredScope` is unset the collection hasn't opted into the role model,
 * so the action is unrestricted here (existing `create`/`delete`/`publish`
 * booleans remain the only gate, unchanged) — this keeps sites that don't
 * configure `roles` byte-for-byte backwards compatible.
 */
export function userCanPerform(
  requiredScope: CmsScope | undefined,
  user: Pick<User, 'role'> | undefined,
  config: Pick<CmsConfig, 'roles'> | undefined,
): boolean {
  return scopeAllows(resolveUserScopes(user, config), requiredScope);
}
