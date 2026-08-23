/**
 * In-house hash history, replacing the `history` package (v5) that used to
 * back the default router (`createDefaultRouter` in `@/core/routing`). It
 * keeps history@5's model where it was sound: the
 * location lives after the `#`, every entry this history creates is stamped
 * with a monotonically increasing `idx` in `window.history.state`, and a
 * blocked navigation is *reverted first*, then handed to the blocker as a
 * transition whose `retry()` re-performs it.
 *
 * It fixes the one place history@5 was unsound for us: a POP onto an entry it
 * did not create (no `idx` in native state; most commonly the very first Back
 * the user presses, landing on whatever entry existed before the app booted).
 * history@5 could only warn and let that navigation through unguarded, which
 * forced hand-rolled `hashchange` safety nets into the editor hooks
 * (DCMS-286/DCMS-456/DCMS-569). Here such a POP is reverted by pushing the
 * current location back on top of the foreign entry, and the blocker's
 * `retry()` rewrites that reverted entry to the attempted destination, so
 * `block()` covers every navigation and the safety nets are unnecessary.
 *
 * The object this returns is also shape-compatible with what react-router
 * v7's `unstable_HistoryRouter` needs from a history (`action`, `location`,
 * `listen`, and the `createHref`/`push`/`replace`/`go` navigator methods), so
 * a host app's react-router bridge can bind to the same instance.
 *
 * Unlike history@5, `block()` does NOT auto-register a `beforeunload` guard;
 * page-unload prompts are the caller's concern (the editor hooks install
 * their own with a proper message).
 */

export type HistoryAction = 'POP' | 'PUSH' | 'REPLACE';

export interface HistoryPath {
  pathname: string;
  search: string;
  hash: string;
}

/** A navigation target: a path string or a partial path object. */
export type HistoryTo = string | Partial<HistoryPath>;

export interface HistoryLocation extends HistoryPath {
  state: unknown;
  key: string;
}

/** Payload delivered to `listen` subscribers on every applied navigation. */
export interface HistoryUpdate {
  action: HistoryAction;
  location: HistoryLocation;
}

export type HistoryListener = (update: HistoryUpdate) => void;

/**
 * A navigation intercepted by a blocker. The navigation has already been
 * reverted (the URL bar shows the current location again); calling `retry()`
 * re-performs it, not calling it leaves it cancelled.
 */
export interface HistoryTransition extends HistoryUpdate {
  retry(): void;
}

export type HistoryBlocker = (tx: HistoryTransition) => void;

export interface HashHistory {
  readonly action: HistoryAction;
  readonly location: HistoryLocation;
  createHref(to: HistoryTo): string;
  push(to: HistoryTo, state?: unknown): void;
  replace(to: HistoryTo, state?: unknown): void;
  go(delta: number): void;
  back(): void;
  forward(): void;
  listen(listener: HistoryListener): () => void;
  block(blocker: HistoryBlocker): () => void;
}

/** Joins path pieces back into a single string ('/foo?a=1#frag'). */
export function createPath({ pathname = '/', search = '', hash = '' }: Partial<HistoryPath>) {
  let path = pathname;
  if (search && search !== '?') path += search.charAt(0) === '?' ? search : `?${search}`;
  if (hash && hash !== '#') path += hash.charAt(0) === '#' ? hash : `#${hash}`;
  return path;
}

/** Splits a path string into its pathname / search / hash pieces. */
export function parsePath(path: string): Partial<HistoryPath> {
  const parsed: Partial<HistoryPath> = {};
  if (path) {
    const hashIndex = path.indexOf('#');
    if (hashIndex >= 0) {
      parsed.hash = path.slice(hashIndex);
      path = path.slice(0, hashIndex);
    }
    const searchIndex = path.indexOf('?');
    if (searchIndex >= 0) {
      parsed.search = path.slice(searchIndex);
      path = path.slice(0, searchIndex);
    }
    if (path) parsed.pathname = path;
  }
  return parsed;
}

function createKey() {
  return Math.random().toString(36).slice(2, 10);
}

interface Events<T> {
  readonly length: number;
  push(handler: (arg: T) => void): () => void;
  call(arg: T): void;
}

function createEvents<T>(): Events<T> {
  let handlers: ((arg: T) => void)[] = [];
  return {
    get length() {
      return handlers.length;
    },
    push(handler) {
      handlers.push(handler);
      return () => {
        handlers = handlers.filter(h => h !== handler);
      };
    },
    call(arg) {
      handlers.forEach(handler => handler(arg));
    },
  };
}

/** The shape this history stamps into `window.history.state`. */
interface NativeState {
  usr: unknown;
  key: string;
  idx: number;
}

export interface HashHistoryOptions {
  /** Defaults to `document.defaultView`; injectable for tests. */
  window?: Window;
}

export function createHashHistory({
  window = document.defaultView!,
}: HashHistoryOptions = {}): HashHistory {
  const globalHistory = window.history;

  function getIndexAndLocation(): [number | undefined, HistoryLocation] {
    const {
      pathname = '/',
      search = '',
      hash = '',
    } = parsePath(window.location.hash.slice(1));
    const state = (globalHistory.state || {}) as Partial<NativeState>;
    return [
      state.idx,
      {
        pathname,
        search,
        hash,
        state: state.usr ?? null,
        key: state.key || 'default',
      },
    ];
  }

  function getBaseHref() {
    const base = window.document.querySelector('base');
    if (!base || !base.getAttribute('href')) return '';
    const url = window.location.href;
    const hashIndex = url.indexOf('#');
    return hashIndex === -1 ? url : url.slice(0, hashIndex);
  }

  function createHref(to: HistoryTo) {
    return `${getBaseHref()}#${typeof to === 'string' ? to : createPath(to)}`;
  }

  function getNextLocation(to: HistoryTo, state: unknown = null): HistoryLocation {
    return {
      pathname: location.pathname,
      search: '',
      hash: '',
      ...(typeof to === 'string' ? parsePath(to) : to),
      state,
      key: createKey(),
    };
  }

  function nativeState(nextLocation: HistoryLocation, idx: number): NativeState {
    return { usr: nextLocation.state, key: nextLocation.key, idx };
  }

  const listeners = createEvents<HistoryUpdate>();
  const blockers = createEvents<HistoryTransition>();

  let action: HistoryAction = 'POP';
  let [index, location] = getIndexAndLocation();

  // Adopt the entry we booted on so the very first back/forward around it has
  // a known idx.
  if (index == null) {
    index = 0;
    globalHistory.replaceState({ ...globalHistory.state, idx: index }, '');
  }

  function applyTx(nextAction: HistoryAction) {
    action = nextAction;
    // `index` legitimately becomes undefined after an unguarded POP onto an
    // entry this history did not create; every consumer of it below falls
    // back to re-anchoring at 0 (history@5 instead let NaN leak into the
    // stamped idx values).
    [index, location] = getIndexAndLocation();
    listeners.call({ action, location });
  }

  /**
   * Runs the blockers for an attempted PUSH/REPLACE. Returns true when the
   * navigation may proceed; with blockers installed it is held instead and
   * only `retry` (handed to the blockers) re-attempts it.
   */
  function allowTx(action: HistoryAction, location: HistoryLocation, retry: () => void) {
    if (!blockers.length) return true;
    blockers.call({ action, location, retry });
    return false;
  }

  // A POP we reverted with `go(delta)` while blocked: delivered to the
  // blockers once the revert's own popstate lands (so the URL bar is already
  // back on the current location when the blocker runs).
  let blockedPopTx: HistoryTransition | null = null;

  function handlePop() {
    if (blockedPopTx) {
      // Clear BEFORE calling: a blocker that synchronously re-enters this
      // handler (retry -> traversal -> popstate) must not be handed the same
      // transition twice.
      const tx = blockedPopTx;
      blockedPopTx = null;
      blockers.call(tx);
      return;
    }

    const [nextIndex, nextLocation] = getIndexAndLocation();

    if (!blockers.length) {
      applyTx('POP');
      return;
    }

    if (nextIndex != null && index != null) {
      const delta = index - nextIndex;
      if (delta) {
        // Revert the POP, then hand it to the blockers when the revert lands.
        blockedPopTx = {
          action: 'POP',
          location: nextLocation,
          retry() {
            go(delta * -1);
          },
        };
        go(delta);
      }
      return;
    }

    // POP where either side lacks an idx (an entry this history did not
    // create), so there is no delta to revert through. Instead push the
    // current location back on top of the foreign entry (restoring the URL
    // bar synchronously; forward entries are truncated, as with any
    // cancelled navigation) and hand the blockers a retry that rewrites that
    // reverted entry into the attempted destination. This is the case
    // history@5 could only warn about and let through unguarded
    // (DCMS-286/DCMS-569).
    const anchorIdx = index ?? 0;
    globalHistory.pushState(nativeState(location, anchorIdx), '', createHref(location));
    index = anchorIdx;
    blockers.call({
      action: 'POP',
      location: nextLocation,
      retry() {
        globalHistory.replaceState(
          nativeState(nextLocation, anchorIdx),
          '',
          createHref(nextLocation),
        );
        applyTx('POP');
      },
    });
  }

  window.addEventListener('popstate', handlePop);
  // popstate covers hash navigation in every modern browser, but an external
  // hash mutation in some embedders (and jsdom) surfaces only as hashchange;
  // ignore the echo when popstate already handled it.
  window.addEventListener('hashchange', () => {
    const [, nextLocation] = getIndexAndLocation();
    if (blockedPopTx) {
      // A blocked POP's revert traversal is in flight. Its own popstate will
      // deliver the transition once the URL is back on the current location;
      // consuming it here would run the blocker while the browser is still
      // on the popped entry, so the transition's `retry()` would traverse
      // from the wrong position (Chrome dispatches this hashchange before
      // the revert commits). Only deliver from here when the URL already
      // matches the current location and no popstate is coming (an
      // environment that fires hashchange but not popstate for traversals).
      if (createPath(nextLocation) === createPath(location)) {
        const tx = blockedPopTx;
        blockedPopTx = null;
        blockers.call(tx);
      }
      return;
    }
    if (createPath(nextLocation) !== createPath(location)) {
      handlePop();
    }
  });

  function push(to: HistoryTo, state?: unknown) {
    const nextLocation = getNextLocation(to, state);
    function retry() {
      push(to, state);
    }
    if (allowTx('PUSH', nextLocation, retry)) {
      // try...catch because iOS limits the number of pushState calls; the
      // fallback full navigation loses `state` but keeps the URL correct.
      try {
        globalHistory.pushState(
          nativeState(nextLocation, (index ?? 0) + 1),
          '',
          createHref(nextLocation),
        );
      } catch {
        window.location.assign(createHref(nextLocation));
      }
      applyTx('PUSH');
    }
  }

  function replace(to: HistoryTo, state?: unknown) {
    const nextLocation = getNextLocation(to, state);
    function retry() {
      replace(to, state);
    }
    if (allowTx('REPLACE', nextLocation, retry)) {
      globalHistory.replaceState(nativeState(nextLocation, index ?? 0), '', createHref(nextLocation));
      applyTx('REPLACE');
    }
  }

  function go(delta: number) {
    globalHistory.go(delta);
  }

  return {
    get action() {
      return action;
    },
    get location() {
      return location;
    },
    createHref,
    push,
    replace,
    go,
    back() {
      go(-1);
    },
    forward() {
      go(1);
    },
    listen(listener) {
      return listeners.push(listener);
    },
    block(blocker) {
      return blockers.push(blocker);
    },
  };
}
