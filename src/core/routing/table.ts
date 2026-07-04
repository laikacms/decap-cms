/**
 * The routing table is the single source of truth mapping every named CMS
 * route to a URL. Each entry is bidirectional:
 *   - `create(params)` builds the path from typed params (used by `navigate`).
 *   - `get(path)`       parses the path back into those params (used by `params`).
 *
 * There is exactly one entry per `<Route>` rendered in `App`. A consumer that
 * wants different URLs (or to plug into their own router) can supply a
 * replacement table to `DecapCmsProvider` — as long as `create`/`get` stay
 * inverses of each other, the rest of core keeps working unchanged.
 *
 * `get` throws on a non-matching path: callers already know which route they
 * are on (they pass the matching key to `useParams`), so a mismatch is a bug,
 * not a control-flow signal.
 */

interface RootRouteParams {}

interface CollectionRouteParams {
  collectionName: string;
}

interface NewEntryRouteParams {
  collectionName: string;
}

interface EntryRouteParams {
  collectionName: string;
  slug: string;
}

interface CollectionSearchRouteParams {
  collectionName: string;
  searchTerm: string;
}

interface CollectionFilterRouteParams {
  collectionName: string;
  filterTerm: string;
}

interface SearchRouteParams {
  searchTerm: string;
}

interface EditRouteParams {
  collectionName: string;
  slug: string;
}

interface WorkflowRouteParams {}

export interface RoutingTable {
  /** `/` — home; redirects to the first non-hidden collection (or `renderRoot`). */
  root: {
    create: (params?: RootRouteParams) => string;
    get: (path: string) => RootRouteParams;
  };
  /** `/collections/:name` — a collection's entry list. */
  collection: {
    create: (params: CollectionRouteParams) => string;
    get: (path: string) => CollectionRouteParams;
  };
  /** `/collections/:name/new` — the editor for a brand-new entry. */
  entryNew: {
    create: (params: NewEntryRouteParams) => string;
    get: (path: string) => NewEntryRouteParams;
  };
  /** `/collections/:name/entries/*` — the editor for an existing entry (slug is a splat). */
  entry: {
    create: (params: EntryRouteParams) => string;
    get: (path: string) => EntryRouteParams;
  };
  /** `/collections/:name/search/:searchTerm` — search results scoped to a collection. */
  collectionSearch: {
    create: (params: CollectionSearchRouteParams) => string;
    get: (path: string) => CollectionSearchRouteParams;
  };
  /** `/collections/:name/filter/*` — a filtered collection view (filter term is a splat). */
  collectionFilter: {
    create: (params: CollectionFilterRouteParams) => string;
    get: (path: string) => CollectionFilterRouteParams;
  };
  /** `/search/:searchTerm` — global search results across all collections. */
  search: {
    create: (params: SearchRouteParams) => string;
    get: (path: string) => SearchRouteParams;
  };
  /** `/workflow` — the editorial workflow board (only mounted when workflow is enabled). */
  workflow: {
    create: (params?: WorkflowRouteParams) => string;
    get: (path: string) => WorkflowRouteParams;
  };
  /** `/edit/:name/:entryName` — legacy edit URL; redirects to the `entry` route. */
  editRedirect: {
    create: (params: EditRouteParams) => string;
    get: (path: string) => EditRouteParams;
  };
}

export type Route = keyof RoutingTable;

export type RouteParams<T extends Route> = ReturnType<RoutingTable[T]['get']>;

export type RouteMatch = {
  [K in keyof RoutingTable]: { key: K; params: ReturnType<RoutingTable[K]['get']> };
}[keyof RoutingTable];
