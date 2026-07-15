import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { Global } from '@emotion/react';

import { I18n } from '@/core/i18n';
import { AlertDialogHost } from '@/ui/AlertDialog';
import { GlobalStyles, DefaultTokensGlobalStyle, themeToCssVars } from '@/ui/default/index';
import { store } from '@/core/redux';
import { useAppSelector, useAppDispatch } from '@/core/hooks/useRedux';
import { loadConfig } from '@/core/actions/config';
import { authenticateUser } from '@/core/actions/auth';
import { getPhrases } from '@/core/lib/phrases';
import { selectLocale } from '@/core/reducers/config';
import { context } from '@/core/contexts/decap';
import { defaultRoutingTable, createRoutePath } from '@/core/routing/router';
import { createDefaultRouter } from '@/core/routing/defaultRouter';
import { setActiveRouting } from '@/core/routing/registry';
import { RouterProvider, useRouter, useLocation } from '@/core/routing/context';

// Side-effect registrations the CMS needs regardless of which layout renders
// it: editor widgets and the media library. Importing them here means every
// consumer of the provider gets them.
import '@/core/components/EditorWidgets';
import '@/core/mediaLibrary';

import type {
  DecapCmsProviderProps,
  DecapCmsContext,
  DecapNavigate,
  DecapParams,
} from '@/core/contexts/decap';
import type { DecapTheme } from '@/ui/default/index';
import type { AppDispatch } from '@/core/redux';
import type { CmsConfig } from '@/lib/util/index';

export type { DecapCmsProviderProps } from '@/core/contexts/decap';

/**
 * Dispatches `loadConfig` (and `authenticateUser` once config is ready) exactly
 * once. Kept as a child component so it runs inside the Redux `Provider`.
 */
function ConfigLoader({ config }: { config?: CmsConfig }) {
  const dispatch = useAppDispatch();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) {
      return;
    }
    loadedRef.current = true;
    (dispatch as AppDispatch)(
      loadConfig(config, function onLoad() {
        (dispatch as AppDispatch)(authenticateUser());
      }),
    );
  }, [dispatch, config]);

  return null;
}

/**
 * Provides the i18n translation context, with the locale and
 * phrases derived from the config in the store.
 */
function I18nProvider({ children }: { children?: React.ReactNode }) {
  const locale = useAppSelector((state: any) => selectLocale(state.config));
  return (
    <I18n locale={locale} messages={getPhrases(locale)}>
      {children as React.ReactElement}
    </I18n>
  );
}


/**
 * Builds and supplies the Decap routing/config context. Reads the live config
 * from the store and the active router from the `RouterProvider` ancestor, then
 * derives the `navigate` / `params` / `path` values consumers read via
 * `useNavigate` / `useParams` / `useDecap`. Memoized so the value only changes
 * when the config, theme, router, or location does. Must render inside a
 * `RouterProvider`.
 */
function RoutingProvider({
  routing,
  theme,
  children,
}: Pick<DecapCmsProviderProps, 'routing' | 'theme' | 'children'>) {
  const resolvedRouting = routing ?? defaultRoutingTable;
  const config = useAppSelector(state => state.config) as CmsConfig;
  const router = useRouter();
  const { pathname } = useLocation();

  // Register the pair for code that runs outside React (Redux thunks and the
  // `routing/navigation` helpers). Done during render — a plain idempotent
  // pointer swap — so it is set before any child can dispatch a navigating
  // thunk.
  setActiveRouting({ router, routing: resolvedRouting });

  const navigate = useCallback<DecapNavigate>(
    (key, params, options) => {
      const path = createRoutePath(resolvedRouting, key, params as never);
      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
    },
    [router, resolvedRouting],
  );

  const params = useCallback<DecapParams>(
    key => resolvedRouting[key].get(pathname) as never,
    [resolvedRouting, pathname],
  );

  const value = useMemo<DecapCmsContext>(
    () => ({
      config,
      theme: theme ?? {},
      routing: resolvedRouting,
      router,
      navigate,
      params,
      path: pathname,
    }),
    [config, theme, resolvedRouting, router, navigate, params, pathname],
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

/**
 * Sets up everything the Decap CMS components need to run — the Redux store,
 * global styles, config loading, the i18n context and the routing context.
 * Render the default `App`, or your own layout built from the exported
 * components and hooks, as children.
 *
 * Navigation goes entirely through our own `Router` (the `RouterProvider`
 * below; a hash router is created when no `router` prop is supplied — the
 * router is fixed for the provider's lifetime). Components read the location
 * via `useDecap`/`useNavigate`/`useParams` (or the in-house
 * `<Link>`/`<NavLink>`).
 *
 * @example
 * <DecapCmsProvider config={config}>
 *   <App />
 * </DecapCmsProvider>
 */
export function DecapCmsProvider({
  config,
  theme,
  children,
  routing,
  router,
}: DecapCmsProviderProps) {
  // Zero-config fallback: create one default hash router for this provider's
  // lifetime. Created lazily so supplying a custom `router` never constructs
  // (or attaches the window listeners of) the hash history at all.
  const [resolvedRouter] = useState(() => router ?? createDefaultRouter());

  return (
    <Provider store={store}>
      <GlobalStyles />
      <DefaultTokensGlobalStyle />
      {theme ? <Global styles={{ ':root': themeToCssVars(theme) }} /> : null}
      <ConfigLoader config={config} />
      <AlertDialogHost />
      <I18nProvider>
        <RouterProvider router={resolvedRouter}>
          <RoutingProvider routing={routing} theme={theme}>
            {children}
          </RoutingProvider>
        </RouterProvider>
      </I18nProvider>
    </Provider>
  );
}

export default DecapCmsProvider;
