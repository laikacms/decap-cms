import type { Route, RouteParams, RoutingTable } from './table';

/** A navigation action: how the current location was reached. */
export type RouterAction = 'PUSH' | 'REPLACE' | 'POP';

/** The current location, narrowed to the parts core reads. */
export interface RouterLocation {
  pathname: string;
  search: string;
}

/** Payload delivered to `subscribe` listeners on every navigation. */
export interface RouterUpdate {
  location: RouterLocation;
  action: RouterAction;
}

/**
 * A pending navigation handed to a `block` blocker. The navigation is held
 * until `retry()` is called; not calling it cancels the navigation (that is
 * how the unsaved-changes guard vetoes a route change). Blocking covers every
 * navigation kind, including browser back/forward and external hash edits
 * (POP); by the time the blocker runs, a blocked POP's URL-bar change has
 * already been reverted.
 */
export interface RouterTransition {
  location: RouterLocation;
  action: RouterAction;
  retry: () => void;
}

/** Called for each attempted navigation while a block is installed. */
export type RouterBlocker = (transition: RouterTransition) => void;

/**
 * A `Router` is the history driver a consumer plugs in so core can navigate
 * and read the current location without owning the history mechanics itself.
 * It is deliberately a *primitive* port: paths in and out are opaque strings
 * produced/parsed by the routing table (`RoutingTable`), which is the separate
 * customization axis for the URL scheme. A custom router therefore only
 * adapts history mechanics (hash vs. History API vs. a host framework's
 * router); it never re-implements routing.
 *
 * The default implementation (`createDefaultRouter` in `./defaultRouter`) is
 * a leaf module wrapping the in-house hash history — nothing in core's engine
 * imports it; the app shells create an instance and hand it to
 * `DecapCmsProvider`.
 */
export interface Router {
  /** The current location (`pathname` is the portion routes match on). */
  location(): RouterLocation;
  /** Push a new history entry for `path`. */
  push(path: string): void;
  /** Replace the current history entry with `path` (used for redirects). */
  replace(path: string): void;
  /** Turn a path into an `href` for an anchor (hash-prefixed for hash routing). */
  href(path: string): string;
  /**
   * Subscribe to location changes (both programmatic navigation and browser
   * back/forward). Returns an unsubscribe function. Core uses this to re-render
   * on navigation — without it the UI would not update after a push.
   */
  subscribe(listener: (update: RouterUpdate) => void): () => void;
  /**
   * Install a navigation guard. The blocker runs for every attempted
   * navigation and holds it until it calls `transition.retry()`. Returns an
   * unblock function. Backs the editor's unsaved-changes prompt. Optional: a
   * router that cannot intercept navigation may omit it, degrading the guard
   * to `beforeunload`-only protection.
   */
  block?(blocker: RouterBlocker): () => void;
}

/**
 * Every dynamic path segment is percent-encoded on `create` (via
 * `encodeURIComponent`) and percent-decoded on `get` (via `decodeSegment`
 * below), so a segment's value round-trips exactly through the URL — spaces,
 * `/`, `#`, `?`, and unicode/emoji all survive, and a literal `/` inside a
 * value (e.g. a free-text search query) is encoded to `%2F` and so cannot
 * split the path into extra segments or break the anchored regexes.
 */

/**
 * Decode a matched path segment, turning a malformed escape (`%ZZ`) into the
 * route's own "invalid path" error instead of letting `decodeURIComponent`'s
 * `URIError` escape — a corrupted hash should land on `NotFoundPage`
 * (`matchRoute` returns `null`), not crash the app.
 */
function decodeSegment(segment: string, errorMessage: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw new Error(errorMessage);
  }
}

/**
 * The default URL scheme: one bidirectional entry per named route. `create`
 * builds a path from params; `get` parses params back out (throwing on a
 * non-match). They are inverses, so `RouteParams<T>` serves both directions.
 */
export const defaultRoutingTable: RoutingTable = {
  root: {
    create: () => `/`,
    get: path => {
      if (path !== '/') throw new Error(`Invalid root path: ${path}`);
      return {};
    },
  },
  collection: {
    create: ({ collectionName }) => `/collections/${encodeURIComponent(collectionName)}`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)$/);
      if (!match) throw new Error(`Invalid collection path: ${path}`);
      return { collectionName: decodeSegment(match[1], `Invalid collection path: ${path}`) };
    },
  },
  entryNew: {
    create: ({ collectionName }) => `/collections/${encodeURIComponent(collectionName)}/new`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)\/new$/);
      if (!match) throw new Error(`Invalid new entry path: ${path}`);
      return { collectionName: decodeSegment(match[1], `Invalid new entry path: ${path}`) };
    },
  },
  entry: {
    create: ({ collectionName, slug }) =>
      `/collections/${encodeURIComponent(collectionName)}/entries/${encodeURIComponent(slug)}`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)\/entries\/(.+)$/);
      if (!match) throw new Error(`Invalid entry path: ${path}`);
      return {
        collectionName: decodeSegment(match[1], `Invalid entry path: ${path}`),
        slug: decodeSegment(match[2], `Invalid entry path: ${path}`),
      };
    },
  },
  collectionSearch: {
    create: ({ collectionName, searchTerm }) =>
      `/collections/${encodeURIComponent(collectionName)}/search/${encodeURIComponent(searchTerm)}`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)\/search\/([^/]+)$/);
      if (!match) throw new Error(`Invalid collection search path: ${path}`);
      return {
        collectionName: decodeSegment(match[1], `Invalid collection search path: ${path}`),
        searchTerm: decodeSegment(match[2], `Invalid collection search path: ${path}`),
      };
    },
  },
  collectionFilter: {
    create: ({ collectionName, filterTerm }) =>
      `/collections/${encodeURIComponent(collectionName)}/filter/${encodeURIComponent(filterTerm)}`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)\/filter\/(.+)$/);
      if (!match) throw new Error(`Invalid collection filter path: ${path}`);
      return {
        collectionName: decodeSegment(match[1], `Invalid collection filter path: ${path}`),
        filterTerm: decodeSegment(match[2], `Invalid collection filter path: ${path}`),
      };
    },
  },
  search: {
    create: ({ searchTerm }) => `/search/${encodeURIComponent(searchTerm)}`,
    get: path => {
      const match = path.match(/^\/search\/([^/]+)$/);
      if (!match) throw new Error(`Invalid search path: ${path}`);
      return { searchTerm: decodeSegment(match[1], `Invalid search path: ${path}`) };
    },
  },
  workflow: {
    create: () => `/workflow`,
    get: path => {
      if (path !== '/workflow') throw new Error(`Invalid workflow path: ${path}`);
      return {};
    },
  },
  editRedirect: {
    create: ({ collectionName, slug }) => `/edit/${encodeURIComponent(collectionName)}/${encodeURIComponent(slug)}`,
    get: path => {
      const match = path.match(/^\/edit\/([^/]+)\/([^/]+)$/);
      if (!match) throw new Error(`Invalid edit path: ${path}`);
      return {
        collectionName: decodeSegment(match[1], `Invalid edit path: ${path}`),
        slug: decodeSegment(match[2], `Invalid edit path: ${path}`),
      };
    },
  },
  media: {
    create: () => `/media`,
    get: path => {
      if (path !== '/media') throw new Error(`Invalid media path: ${path}`);
      return {};
    },
  },
};

/**
 * A successful match: the route `key` plus its parsed params, discriminated so
 * `switch (match.key)` narrows `match.params` to the right shape.
 */
export type RouteMatch = {
  [K in Route]: { key: K, params: ReturnType<RoutingTable[K]['get']> };
}[Route];

/**
 * Find the table entry whose `get` accepts `path` and return its key + parsed
 * params, or `null` if none match. Each `get` throws on a non-match, so we try
 * them in turn and keep the first that parses. The default routes are mutually
 * exclusive (anchored patterns), so iteration order does not affect the result.
 *
 * This is the single matcher — the route switch in `App` and the `params`
 * context callback both reuse it rather than re-deriving the URL grammar (a
 * hand-rolled matcher would drift from the table).
 */
export function matchRoute(routing: RoutingTable, path: string): RouteMatch | null {
  for (const key of Object.keys(routing) as Route[]) {
    try {
      return { key, params: routing[key].get(path) } as RouteMatch;
    } catch {
      // Not this route; try the next entry.
    }
  }
  return null;
}

/**
 * Build a path for the named route via the table's `create`. The per-route
 * input types form a union TS can't correlate with the indexed `route` key, so
 * the call is cast at this single choke point; callers keep fully typed
 * params.
 */
export function createRoutePath<T extends Route>(
  routing: RoutingTable,
  route: T,
  params?: RouteParams<T>,
): string {
  return routing[route].create(params as never);
}
