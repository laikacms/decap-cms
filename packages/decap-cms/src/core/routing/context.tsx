import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { Router, RouterLocation } from './router';

interface RouterContextValue {
  router: Router;
  location: RouterLocation;
}

/**
 * Holds the active `Router` plus the current location. `location` is React
 * state kept in sync via `router.subscribe`, so every consumer of `useRouter`
 * / `useLocation` (and the in-house `<Link>` / `<NavLink>`) re-renders on
 * navigation. `null` until a `RouterProvider` is mounted.
 */
const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * Supplies the routing context. `DecapCmsProvider` renders this with the
 * consumer-supplied router (or its default hash router); tests can render it
 * directly with a router to exercise `<Link>` / `useLocation` in isolation.
 */
export function RouterProvider({
  router,
  children,
}: {
  router: Router,
  children?: React.ReactNode,
}) {
  const [location, setLocation] = useState<RouterLocation>(() => router.location());

  useEffect(() => {
    // Re-sync on mount: the location can change between the initial state and
    // this effect (a redirect fired during config load, or StrictMode's
    // double-invoke), then subscribe for every navigation afterwards.
    setLocation(router.location());
    return router.subscribe(({ location: next }) => setLocation(next));
  }, [router]);

  const value = useMemo<RouterContextValue>(() => ({ router, location }), [router, location]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouterContext(): RouterContextValue {
  const value = useContext(RouterContext);
  if (!value) {
    throw new Error('Routing hooks must be used within a DecapCmsProvider (or RouterProvider)');
  }
  return value;
}

/** The active `Router`. Stable across renders unless the provider swaps it. */
export function useRouter(): Router {
  return useRouterContext().router;
}

/**
 * The current location (`pathname` + `search`). Updates on every navigation,
 * so components that read it re-render. Replaces react-router's `useLocation`.
 */
export function useLocation(): RouterLocation {
  return useRouterContext().location;
}
