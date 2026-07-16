import { createHashHistory } from '@/lib/routing/hashHistory';

import type { HashHistory, HashHistoryOptions, HistoryUpdate } from '@/lib/routing/hashHistory';
import type { Router, RouterBlocker } from './router';

/**
 * The default `Router`: hash-based URLs driven by the in-house hash history
 * (`@/lib/routing/hashHistory`). This module is a *leaf* — nothing in core's
 * engine imports it except `DecapCmsProvider`'s zero-config fallback; the app
 * shells create their own instance and pass it in, so a consumer supplying a
 * custom `Router` never loads or runs any of this.
 */
export interface DefaultRouter extends Router {
  /**
   * The underlying hash history instance. Exposed so a shell that keeps its
   * own react-router bridge (laika's `unstable_HistoryRouter`) can bind it to
   * the same instance this router drives, keeping both in sync. The object is
   * shape-compatible with what react-router v7 needs from a history.
   */
  readonly history: HashHistory;
  /** The default router always supports navigation guards. */
  block(blocker: RouterBlocker): () => void;
}

function toRouterUpdate({ location, action }: HistoryUpdate) {
  return {
    location: { pathname: location.pathname, search: location.search },
    action,
  };
}

/**
 * Create a hash-history-backed `Router`. Each call creates (and starts
 * listening with) its own history instance, so create exactly one per app
 * shell and hand it to `DecapCmsProvider`.
 */
export function createDefaultRouter(options: HashHistoryOptions = {}): DefaultRouter {
  const history = createHashHistory(options);

  return {
    history,
    location() {
      return { pathname: history.location.pathname, search: history.location.search };
    },
    push(path) {
      history.push(path);
    },
    replace(path) {
      history.replace(path);
    },
    href(path) {
      return history.createHref(path);
    },
    subscribe(listener) {
      return history.listen(update => listener(toRouterUpdate(update)));
    },
    block(blocker) {
      return history.block(({ location, action, retry }) => {
        blocker({ ...toRouterUpdate({ location, action }), retry });
      });
    },
  };
}
