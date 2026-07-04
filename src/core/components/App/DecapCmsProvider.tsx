import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Provider } from 'react-redux';
import { I18n } from 'react-polyglot';
import { Global } from '@emotion/react';

import { GlobalStyles, DefaultTokensGlobalStyle, themeToCssVars } from '../../../ui-default/index';
import { store } from '../../redux';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { loadConfig } from '../../actions/config';
import { authenticateUser } from '../../actions/auth';
import { getPhrases } from '../../lib/phrases';
import { selectLocale } from '../../reducers/config';
import { context } from '../../contexts/decap';
import { defaultRoutingTable } from '../../routing/router';
import { RouterProvider, useRouter, useLocation } from '../../routing/context';

// Side-effect registrations the CMS needs regardless of which layout renders
// it: editor widgets, the media library, and the `what-input` accessibility
// helper. Importing them here means every consumer of the provider gets them.
import '../EditorWidgets';
import '../../mediaLibrary';
import 'what-input';

import type {
  DecapCmsProviderProps,
  DecapCmsContext,
  DecapNavigate,
  DecapParams,
} from '../../contexts/decap';
import type { DecapTheme } from '../../../ui-default/index';
import type { AppDispatch } from '../../redux';
import type { CmsConfig } from '../../../lib-util/index';

export type { DecapCmsProviderProps } from '../../contexts/decap';

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
 * Provides the `react-polyglot` translation context, with the locale and
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

  const navigate = useCallback<DecapNavigate>(
    (key, params, options) => {
      if (options?.replace) {
        router.replace(key, params as never);
      } else {
        router.navigate(key, params as never);
      }
    },
    [router],
  );

  const params = useCallback<DecapParams>(key => router.params(key) as never, [router]);

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
 * below, defaulting to `defaultRouter`). Components read the location via
 * `useDecap`/`useNavigate`/`useParams` (or the in-house `<Link>`/`<NavLink>`).
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
  return (
    <Provider store={store}>
      <GlobalStyles />
      <DefaultTokensGlobalStyle />
      {theme ? <Global styles={{ ':root': themeToCssVars(theme) }} /> : null}
      <ConfigLoader config={config} />
      <I18nProvider>
        <RouterProvider router={router}>
          <RoutingProvider routing={routing} theme={theme}>
            {children}
          </RoutingProvider>
        </RouterProvider>
      </I18nProvider>
    </Provider>
  );
}

export default DecapCmsProvider;
