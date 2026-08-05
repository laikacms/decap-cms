/**
 * Scope vocabulary for CMS-issued Personal Access Tokens (PATs).
 *
 * Scopes are additive along resource x verb lines. `admin` is a superset
 * that implies every other scope (parity with the full-admin session
 * token that OAuth currently issues).
 */
export const GRANULAR_SCOPES = [
  'content:read',
  'content:write',
  'media:read',
  'media:write',
  'config:read',
] as const;

export type GranularScope = (typeof GRANULAR_SCOPES)[number];

export const ADMIN_SCOPE = 'admin' as const;

export type Scope = GranularScope | typeof ADMIN_SCOPE;

export const ALL_SCOPES: readonly Scope[] = [...GRANULAR_SCOPES, ADMIN_SCOPE];

export function isScope(value: string): value is Scope {
  return (ALL_SCOPES as readonly string[]).includes(value);
}

/**
 * `admin` grants every granular scope. Expanding it up front means callers
 * never need special-case `admin` checks at the call site.
 */
export function expandScopes(scopes: readonly Scope[]): Scope[] {
  if (scopes.includes(ADMIN_SCOPE)) {
    return [ADMIN_SCOPE, ...GRANULAR_SCOPES];
  }
  return Array.from(new Set(scopes));
}

export function hasScope(granted: readonly Scope[], required: Scope): boolean {
  if (granted.includes(ADMIN_SCOPE)) {
    return true;
  }
  return granted.includes(required);
}
