import { createContext } from 'react';

import type { Router } from '@/core/routing/router';
import type { RoutingTable } from '@/core/routing/table';
import type { CmsConfig, LlmTransport } from '@/lib/util';
import type { DecapTheme } from '@/ui/default';
import type { ReactNode } from 'react';

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
  config?: CmsConfig | undefined;
  /**
   * Optional routing table. Overrides the default URL scheme; must keep
   * `create`/`get` inverse per entry. See `RoutingTable`.
   */
  routing?: RoutingTable | undefined;
  /**
   * Optional theme. Overrides design tokens (currently colors) by emitting the
   * corresponding `--decap-*` CSS variables, so every component that reads a
   * token is re-themed. Omitted tokens keep their default.
   */
  theme?: DecapTheme | undefined;
  /**
   * Override the router — e.g. to route through a host app's own router or
   * the History API instead of hash URLs. Must satisfy the (primitive)
   * `Router` contract; the URL scheme itself is the `routing` table's job.
   * When omitted, the provider creates its own hash router
   * (`createDefaultRouter`). The router is fixed for the provider's lifetime.
   */
  router?: Router | undefined;
  /**
   * The LLM connection the CMS's AI UI talks to (chat panel, translate
   * action). The CMS ships no transport of its own, so omitting this — the
   * default — means no AI UI renders at all. See `LlmTransport`.
   *
   * Prefer this over `CMS.registerLlmTransport`, which exists for injecting a
   * transport into an already-compiled bundle; this prop wins over that.
   */
  llm?: LlmTransport | undefined;
  children?: ReactNode;
}
