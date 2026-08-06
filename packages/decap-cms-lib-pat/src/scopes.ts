/**
 * Scope vocabulary for CMS-issued credentials (PATs and OAuth sessions).
 *
 * Scopes follow a `resource:action` convention and are an OPEN vocabulary.
 * The CMS ships the granular scopes below as well-known defaults, but a
 * consumer building a custom dashboard (Decap CMS now supports injected React
 * components) or fronting a non-CMS surface (e.g. a B2B shop) may grant its
 * own namespaced scopes, e.g. `shipping:read` or `orders:write`. This library
 * never enforces the vocabulary, it only validates the `resource:action`
 * shape and resolves wildcard membership.
 *
 * Wildcards:
 * - `admin` (and the equivalent `*`) grant every scope.
 * - `resource:*` grants every action on that resource (e.g. `content:*`
 *   grants `content:read` and `content:write`).
 */
export const GRANULAR_SCOPES = [
  'content:read',
  'content:write',
  'media:read',
  'media:write',
  'config:read',
] as const;

export type GranularScope = (typeof GRANULAR_SCOPES)[number];

/** Global grant: implies every scope. The canonical name for a full-access credential. */
export const ADMIN_SCOPE = 'admin' as const;

/** Global grant alias, `*`. Treated identically to {@link ADMIN_SCOPE}. */
export const WILDCARD_SCOPE = '*' as const;

/**
 * An open scope: the CMS well-knowns, either global grant, or any
 * `resource:action` pair (including a `resource:*` per-resource wildcard).
 * The template-literal arm is what keeps the vocabulary open to consumer
 * namespaces; the explicit {@link GranularScope} arm keeps autocomplete for
 * the shipped CMS scopes.
 */
export type Scope =
  | GranularScope
  | typeof ADMIN_SCOPE
  | typeof WILDCARD_SCOPE
  | `${string}:${string}`;

/**
 * The CMS's own shipped scopes plus the global admin grant. This is NOT the
 * full universe of valid scopes (the vocabulary is open); it is the set the
 * CMS itself defines, useful for building a default scope picker.
 */
export const ALL_SCOPES: readonly Scope[] = [...GRANULAR_SCOPES, ADMIN_SCOPE];

/**
 * True if `value` is a syntactically valid scope: `admin`, `*`, or a
 * `resource:action` pair with non-empty resource and action. Validation is
 * structural, not membership: a consumer's `shipping:read` is valid even
 * though it is not one of the shipped {@link GRANULAR_SCOPES}.
 */
export function isScope(value: string): value is Scope {
  if (value === ADMIN_SCOPE || value === WILDCARD_SCOPE) {
    return true;
  }
  const [resource, action, ...rest] = value.split(':');
  return rest.length === 0 && !!resource && !!action;
}

/**
 * Does `granted` satisfy `required`, accounting for wildcards?
 *
 * - a global grant (`admin`/`*`) satisfies anything;
 * - an exact match satisfies;
 * - a `resource:*` grant satisfies any `resource:action` on that resource.
 */
export function hasScope(granted: readonly Scope[], required: Scope): boolean {
  if (granted.includes(ADMIN_SCOPE) || granted.includes(WILDCARD_SCOPE)) {
    return true;
  }
  if (granted.includes(required)) {
    return true;
  }
  const colon = required.indexOf(':');
  if (colon > 0) {
    const resource = required.slice(0, colon);
    if (granted.includes(`${resource}:*` as Scope)) {
      return true;
    }
  }
  return false;
}

/**
 * Canonicalize a scope set for storage: dedupe, and collapse a global grant
 * (`admin`/`*`) to a single `admin`. It does NOT enumerate granular scopes:
 * the vocabulary is open, so "every scope" cannot be listed. Wildcard
 * semantics are resolved at check time by {@link hasScope}, not by expanding
 * here.
 */
export function normalizeScopes(scopes: readonly Scope[]): Scope[] {
  if (scopes.includes(ADMIN_SCOPE) || scopes.includes(WILDCARD_SCOPE)) {
    return [ADMIN_SCOPE];
  }
  return Array.from(new Set(scopes));
}
