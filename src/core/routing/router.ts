import { createHashHistory } from 'history';

import type { Route, RouteParams, RoutingTable } from './table';

/**
 * The single hash `history` instance the whole CMS navigates through. It is a
 * private implementation detail of `defaultRouter`: nothing outside this module
 * should import it, so every navigation path (imperative helpers, the context
 * hooks, `<Link>`) funnels through the `Router` abstraction instead.
 *
 * The one sanctioned exception is a consumer that keeps its own react-router
 * bridge (e.g. laika): it re-exports as `routerHistory` so that bridge binds to
 * the same instance and stays in sync with our router.
 */
const history = createHashHistory();

/** The underlying hash history, exposed solely for a consumer's router bridge. */
export { history as routerHistory };

/** A navigation action, mirroring the history package's `Action`. */
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
 * until `retry()` is called; not calling it cancels the navigation (that is how
 * the unsaved-changes guard vetoes a route change).
 */
export interface RouterTransition {
  location: RouterLocation;
  action: RouterAction;
  retry: () => void;
}

/** Called for each attempted navigation while a block is installed. */
export type RouterBlocker = (transition: RouterTransition) => void;

/**
 * A `Router` is the imperative driver a consumer plugs in so core can navigate
 * and read the current location without owning a router itself. The default
 * implementation (`defaultRouter`) wraps the shared hash `history` singleton; a
 * host app can supply its own (e.g. History-API / non-hash URLs, or one backed
 * by their framework's router) as long as it honours this contract.
 *
 * The typed route API (`navigate`/`replace`/`match`/`params`) is the primary
 * surface; the location primitives (`path`/`search`/`href`/`push`/
 * `replacePath`) back the in-house `<Link>`/`<NavLink>` and the redirect
 * special-cases in `App`, and `block` backs the unsaved-changes guard.
 */
export interface Router {
  /** Push a new history entry for the named route. */
  navigate<T extends Route>(route: T, params: RouteParams<T>): void;
  /** Replace the current history entry (used for redirects). */
  replace<T extends Route>(route: T, params: RouteParams<T>): void;
  /** The key of the route the current location is on. Throws if none match. */
  match(): Route;
  /** Parse the current location's params for `route` (throws if not on it). */
  params<T extends Route>(route: T): RouteParams<T>;
  /** The current location pathname (the portion routes match on). */
  path(): string;
  /** The current location query string (leading `?` included, or empty). */
  search(): string;
  /** Turn a path into an `href` for an anchor (hash-prefixed for hash routing). */
  href(path: string): string;
  /** Push a raw path (backs `<Link>` and path-based navigation). */
  push(path: string): void;
  /** Replace the current entry with a raw path. */
  replacePath(path: string): void;
  /**
   * Subscribe to location changes (both programmatic navigation and browser
   * back/forward). Returns an unsubscribe function. Core uses this to re-render
   * on navigation — without it the UI would not update after `navigate`.
   */
  subscribe(listener: (update: RouterUpdate) => void): () => void;
  /**
   * Install a navigation guard. The blocker runs for every attempted
   * navigation and holds it until it calls `transition.retry()`. Returns an
   * unblock function. Backs the editor's unsaved-changes prompt.
   */
  block(blocker: RouterBlocker): () => void;
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
    create: ({ collectionName }) => `/collections/${collectionName}`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)$/);
      if (!match) throw new Error(`Invalid collection path: ${path}`);
      return { collectionName: match[1] };
    },
  },
  entryNew: {
    create: ({ collectionName }) => `/collections/${collectionName}/new`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)\/new$/);
      if (!match) throw new Error(`Invalid new entry path: ${path}`);
      return { collectionName: match[1] };
    },
  },
  entry: {
    create: ({ collectionName, slug }) => `/collections/${collectionName}/entries/${slug}`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)\/entries\/(.+)$/);
      if (!match) throw new Error(`Invalid entry path: ${path}`);
      return { collectionName: match[1], slug: match[2] };
    },
  },
  collectionSearch: {
    create: ({ collectionName, searchTerm }) =>
      `/collections/${collectionName}/search/${searchTerm}`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)\/search\/([^/]+)$/);
      if (!match) throw new Error(`Invalid collection search path: ${path}`);
      return { collectionName: match[1], searchTerm: match[2] };
    },
  },
  collectionFilter: {
    create: ({ collectionName, filterTerm }) =>
      `/collections/${collectionName}/filter/${filterTerm}`,
    get: path => {
      const match = path.match(/^\/collections\/([^/]+)\/filter\/(.+)$/);
      if (!match) throw new Error(`Invalid collection filter path: ${path}`);
      return { collectionName: match[1], filterTerm: match[2] };
    },
  },
  search: {
    create: ({ searchTerm }) => `/search/${searchTerm}`,
    get: path => {
      const match = path.match(/^\/search\/([^/]+)$/);
      if (!match) throw new Error(`Invalid search path: ${path}`);
      return { searchTerm: match[1] };
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
    create: ({ collectionName, slug }) => `/edit/${collectionName}/${slug}`,
    get: path => {
      const match = path.match(/^\/edit\/([^/]+)\/([^/]+)$/);
      if (!match) throw new Error(`Invalid edit path: ${path}`);
      return { collectionName: match[1], slug: match[2] };
    },
  },
};

/**
 * A successful match: the route `key` plus its parsed params, discriminated so
 * `switch (match.key)` narrows `match.params` to the right shape.
 */
export type RouteMatch = {
  [K in Route]: { key: K; params: ReturnType<RoutingTable[K]['get']> };
}[Route];

/**
 * Find the table entry whose `get` accepts `path` and return its key + parsed
 * params, or `null` if none match. Each `get` throws on a non-match, so we try
 * them in turn and keep the first that parses. The default routes are mutually
 * exclusive (anchored patterns), so iteration order does not affect the result.
 *
 * This is the single matcher — `Router.match()` reuses it rather than
 * re-deriving the URL grammar (a hand-rolled matcher would drift from the
 * table).
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
 * The default router wraps the shared hash `history` singleton — the same
 * instance a consumer's react-router bridge (bound to `routerHistory`) and the
 * imperative navigation helpers push to — so every navigation path stays in
 * sync (hash history's `location.pathname` is the part after the `#`).
 * `create`'s per-route input types form a union TS can't correlate with the
 * indexed `route` key, so the call is cast at this single choke point; the
 * public `navigate`/`replace` signatures stay fully typed for callers.
 */
export const defaultRouter: Router = {
  navigate(route, params) {
    history.push(defaultRoutingTable[route].create(params as never));
  },
  replace(route, params) {
    history.replace(defaultRoutingTable[route].create(params as never));
  },
  match() {
    const match = matchRoute(defaultRoutingTable, history.location.pathname);
    if (!match) throw new Error(`No matching route for path: ${history.location.pathname}`);
    return match.key;
  },
  params(route) {
    return defaultRoutingTable[route].get(history.location.pathname) as RouteParams<typeof route>;
  },
  path() {
    return history.location.pathname;
  },
  search() {
    return history.location.search;
  },
  href(path) {
    return `#${path}`;
  },
  push(path) {
    history.push(path);
  },
  replacePath(path) {
    history.replace(path);
  },
  subscribe(listener) {
    return history.listen(({ location, action }) =>
      listener({
        location: { pathname: location.pathname, search: location.search },
        action: action as RouterAction,
      }),
    );
  },
  block(blocker) {
    return history.block(({ location, action, retry }) =>
      blocker({
        location: { pathname: location.pathname, search: location.search },
        action: action as RouterAction,
        retry,
      }),
    );
  },
};
