import { createContext } from 'react';

import type { ReactNode } from 'react';
import type { RoutingTable } from '../routing/table';
import type { Router } from '../routing/router';
import type { CmsConfig } from '../../lib-util';
import type { DecapTheme } from '../../ui-default';

export interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
}

/**
 * Navigate to a named route. Pass the route `key` and its typed params; the
 * routing table turns them into a path. `options.replace` swaps the current
 * history entry (used for redirects) instead of pushing a new one.
 */
export type DecapNavigate = <T extends keyof RoutingTable>(
  key: T,
  params?: Parameters<RoutingTable[T]['create']>[0],
  options?: NavigateOptions,
) => void;

/**
 * Read the params of the named route from the current location. Throws if the
 * current path is not on that route — callers pass the key of the route they
 * are already rendering.
 */
export type DecapParams = <T extends keyof RoutingTable>(
  key: T,
) => ReturnType<RoutingTable[T]['get']>;

export interface DecapCmsContext {
  config: CmsConfig;
  theme: DecapTheme;
  routing: RoutingTable;
  /** The active router driving navigation and location reads. */
  router: Router;
  navigate: DecapNavigate;
  params: DecapParams;
  /**
   * The current location path (the portion routes are matched on). Updates on
   * every navigation, so components that read it re-render.
   */
  path: string;
}

/**
 * The routing/config context that `DecapCmsProvider` supplies and the
 * `useDecap` / `useNavigate` / `useParams` hooks read. `null` until a provider
 * is mounted — the hooks throw a clear error in that case.
 */
export const context = createContext<DecapCmsContext | null>(null);

export interface DecapCmsProviderProps {
  /**
   * Optional config object. Merged into `config.yml` if one is present; any
   * conflicting portion is overwritten by this object.
   */
  config?: CmsConfig;
  /**
   * Optional routing table. Overrides the default URL scheme; must keep
   * `create`/`get` inverse per entry. See `RoutingTable`.
   */
  routing?: RoutingTable;
  /**
   * Optional theme. Overrides design tokens (currently colors) by emitting the
   * corresponding `--decap-*` CSS variables, so every component that reads a
   * token is re-themed. Omitted tokens keep their default.
   */
  theme?: DecapTheme;
  /**
   * Override the router — e.g. to route through a host app's own router or a
   * non-hash URL scheme. Must satisfy the `Router` contract. Defaults to
   * `defaultRouter` (hash history). A custom router should be paired with a
   * matching `routing` table.
   */
  router?: Router;
  children?: ReactNode;
}
