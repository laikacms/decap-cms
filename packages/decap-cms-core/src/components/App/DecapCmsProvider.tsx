import React, { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { I18n } from 'react-polyglot';
import { Global } from '@emotion/react';
import { GlobalStyles, themeToCssVars } from 'decap-cms-ui-default';

import type { DecapTheme } from 'decap-cms-ui-default';

import { store } from '../../redux';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { loadConfig } from '../../actions/config';
import { authenticateUser } from '../../actions/auth';
import { getPhrases } from '../../lib/phrases';
import { selectLocale } from '../../reducers/config';

// Side-effect registrations the CMS needs regardless of which layout renders
// it: editor widgets, the media library, and the `what-input` accessibility
// helper. Importing them here means every consumer of the provider gets them.
import '../EditorWidgets';
import '../../mediaLibrary';
import 'what-input';

import type { AppDispatch } from '../../redux';
import type { CmsConfig } from 'decap-cms-lib-util';

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

export interface DecapCmsProviderProps {
  /**
   * Optional config object. Merged into `config.yml` if one is present; any
   * conflicting portion is overwritten by this object.
   */
  config?: CmsConfig;
  /**
   * Optional theme. Overrides design tokens (currently colors) by emitting the
   * corresponding `--decap-*` CSS variables, so every component that reads a
   * token is re-themed. Omitted tokens keep their default.
   */
  theme?: DecapTheme;
  children?: React.ReactNode;
}

/**
 * Sets up everything the Decap CMS components need to run — the Redux store,
 * global styles, config loading and the i18n context — without imposing a
 * layout or a router. Render the default `App`, or your own layout built from
 * the exported components and hooks, as children.
 *
 * @example
 * <DecapCmsProvider config={config}>
 *   <App />
 * </DecapCmsProvider>
 */
export function DecapCmsProvider({ config, theme, children }: DecapCmsProviderProps) {
  return (
    <Provider store={store}>
      <GlobalStyles />
      {theme ? <Global styles={{ ':root': themeToCssVars(theme) }} /> : null}
      <ConfigLoader config={config} />
      <I18nProvider>{children}</I18nProvider>
    </Provider>
  );
}

export default DecapCmsProvider;
