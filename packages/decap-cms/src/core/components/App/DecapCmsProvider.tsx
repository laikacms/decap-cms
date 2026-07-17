import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Global } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';

import { authenticateUser } from '@/core/actions/auth';
import { loadConfig } from '@/core/actions/config';
import { context } from '@/core/contexts/decap';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { I18n } from '@/core/i18n';
import { createFreshnessController } from '@/core/lib/freshness';
import { getPhrases } from '@/core/lib/phrases';
import { detectTextDirection } from '@/core/lib/textDirection';
import { selectLocale } from '@/core/reducers/config';
import { store } from '@/core/redux';
import { RouterProvider, useLocation, useRouter } from '@/core/routing/context';
import { createDefaultRouter } from '@/core/routing/defaultRouter';
import { setActiveRouting } from '@/core/routing/registry';
import { createRoutePath, defaultRoutingTable } from '@/core/routing/router';
// `registerCoreWidgets`/`connectMediaLibrary`: registrations the CMS needs
// regardless of which layout renders it. Called (idempotently) in the
// provider body so every consumer of the provider gets them without
// import-time side effects anywhere in the module graph.
import { registerCoreWidgets } from '@/core/components/EditorWidgets/index';
import { connectMediaLibrary } from '@/core/mediaLibrary';
import { AlertDialogHost, ConfirmDialogHost, PromptDialogHost } from '@/ui/AlertDialog';
import { DefaultTokensGlobalStyle, GlobalStyles, themeToCssVars } from '@/ui/default/index';

import type { DecapCmsContext, DecapCmsProviderProps, DecapNavigate, DecapParams } from '@/core/contexts/decap';
import type { AppDispatch } from '@/core/redux';
import type { CmsConfig } from '@/lib/util/index';
import type { DecapTheme } from '@/ui/default/index';

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
 * Starts the background content-sync poller ("multiplayer-lite") for backends
 * that expose a sync token. The controller no-ops until a user is authenticated
 * and permanently stops itself when the backend has no sync surface, so this is
 * free for the classic git backends.
 */
function FreshnessLoader() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const controller = createFreshnessController({
      getState: store.getState,
      dispatch,
    });
    controller.start();
    return () => controller.stop();
  }, [dispatch]);

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
  // Idempotent (lodash `once`) — safe across re-renders and multiple
  // providers. Must run before any child resolves widgets.
  registerCoreWidgets();
  connectMediaLibrary();
  // Zero-config fallback: create one default hash router for this provider's
  // lifetime. Created lazily so supplying a custom `router` never constructs
  // (or attaches the window listeners of) the hash history at all.
  const [resolvedRouter] = useState(() => router ?? createDefaultRouter());

  // Base UI's direction context defaults to `ltr` and never reads the DOM, so
  // on RTL host pages (`<html dir="rtl">`) menus, selects and sliders would
  // otherwise keep LTR keyboard and positioning behavior. Read the host page
  // direction once at mount; it is a document-level property that does not
  // change during a session.
  const [direction] = useState(() => detectTextDirection());

  return (
    <Provider store={store}>
      <DirectionProvider direction={direction}>
        <GlobalStyles />
        <DefaultTokensGlobalStyle />
        {theme ? <Global styles={{ ':root': themeToCssVars(theme) }} /> : null}
        <ConfigLoader config={config} />
        <FreshnessLoader />
        <AlertDialogHost />
        <ConfirmDialogHost />
        <PromptDialogHost />
        <I18nProvider>
          <RouterProvider router={resolvedRouter}>
            <RoutingProvider routing={routing} theme={theme}>
              {children}
            </RoutingProvider>
          </RouterProvider>
        </I18nProvider>
      </DirectionProvider>
    </Provider>
  );
}

export default DecapCmsProvider;
