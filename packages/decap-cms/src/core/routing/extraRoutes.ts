/**
 * Pattern matching for consumer-injected extra routes (`ExtraRoute` in the app
 * layer). The built-in CMS routes live in the bidirectional `RoutingTable`;
 * extra routes are one-directional (consumers build their own hrefs), so all
 * they need is a matcher.
 *
 * Pattern grammar, per `/`-separated segment:
 *   - a literal segment matches itself exactly;
 *   - `:name` matches exactly one non-empty segment and captures it (percent-
 *     decoded) under `name`;
 *   - a single trailing `*` matches the (non-empty) remainder of the path and
 *     captures it — decoded per segment, `/` separators preserved — under `*`.
 *
 * Kept deliberately smaller than a router's grammar (no optional segments, no
 * regex constraints): extra routes are app pages, not an URL DSL. Matching is
 * first-declaration-wins, so consumers order specific patterns (`/shop/new`)
 * before capturing ones (`/shop/:id`).
 */

/** A successful match: the captured (decoded) params, keyed by `:name` (or `*`). */
export type ExtraRouteParams = Record<string, string>;

/**
 * Decode a captured segment. A malformed escape (`%ZZ`) fails the match
 * instead of throwing, mirroring `decodeSegment` in `./router` — a corrupted
 * URL should fall through to the not-found page, not crash the app.
 */
function decodeCapture(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * Match `path` against `pattern`. Returns the captured params (empty object
 * for a purely literal pattern) or `null` when the path does not match.
 */
export function matchExtraRoutePattern(pattern: string, path: string): ExtraRouteParams | null {
  // The historical behaviour was `route.path === path`; keep that exact
  // fast-path so purely literal routes (including ones containing `:` or `*`
  // in odd positions, e.g. a literal `/docs/:colon`) never regress.
  if (pattern === path) {
    return {};
  }

  const patternSegments = pattern.split('/');
  const pathSegments = path.split('/');
  const params: ExtraRouteParams = {};

  for (let i = 0; i < patternSegments.length; i += 1) {
    const patternSegment = patternSegments[i];

    if (patternSegment === '*' && i === patternSegments.length - 1) {
      const rest = pathSegments.slice(i);
      if (rest.length === 0 || rest.every(segment => segment === '')) {
        return null;
      }
      const decoded = rest.map(segment => decodeCapture(segment));
      if (decoded.some(segment => segment === null)) {
        return null;
      }
      params['*'] = decoded.join('/');
      return params;
    }

    const pathSegment = pathSegments[i];
    if (pathSegment === undefined) {
      return null;
    }

    if (patternSegment.startsWith(':') && patternSegment.length > 1) {
      if (pathSegment === '') {
        return null;
      }
      const decoded = decodeCapture(pathSegment);
      if (decoded === null) {
        return null;
      }
      params[patternSegment.slice(1)] = decoded;
      continue;
    }

    if (patternSegment !== pathSegment) {
      return null;
    }
  }

  // Every pattern segment matched; the path must not have extra segments left.
  if (pathSegments.length > patternSegments.length) {
    return null;
  }

  return params;
}

/**
 * Find the first route (declaration order) whose `path` pattern matches
 * `path`, returning it with the captured params.
 */
export function matchExtraRoute<T extends { path: string }>(
  routes: readonly T[] | undefined,
  path: string,
): { route: T, params: ExtraRouteParams } | null {
  if (!routes) {
    return null;
  }
  for (const route of routes) {
    const params = matchExtraRoutePattern(route.path, path);
    if (params) {
      return { route, params };
    }
  }
  return null;
}
