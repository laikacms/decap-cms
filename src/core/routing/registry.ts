import type { Router } from './router';
import type { RoutingTable } from './table';

/**
 * The active router + routing table for code that runs outside React — Redux
 * thunks and the imperative helpers in `./navigation`. React code reads the
 * same pair from context (`useRouter` / `useDecap().routing`) instead.
 *
 * `RoutingProvider` (inside `DecapCmsProvider`) registers the pair during
 * render, so it is always set by the time any user action can dispatch a
 * navigating thunk. There is intentionally exactly one slot: the CMS renders
 * one provider per page, and the thunks it registers for are global anyway
 * (they navigate the one URL bar).
 */
export interface ActiveRouting {
  router: Router;
  routing: RoutingTable;
}

let active: ActiveRouting | null = null;

export function setActiveRouting(next: ActiveRouting): void {
  active = next;
}

export function getActiveRouting(): ActiveRouting {
  if (!active) {
    throw new Error(
      'No active router registered. Imperative navigation requires a mounted DecapCmsProvider.',
    );
  }
  return active;
}
