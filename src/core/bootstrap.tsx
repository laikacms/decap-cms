import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { I18n } from 'react-polyglot';

import { GlobalStyles } from '../ui/default/index';
import { useAppSelector } from './hooks/useRedux';
import { store } from './redux';
import { loadConfig } from './actions/config';
import { authenticateUser } from './actions/auth';
import { getPhrases } from './lib/phrases';
import { selectLocale } from './reducers/config';
import { ErrorBoundary } from './components/UI';
import App from './components/App/App';
import './components/EditorWidgets';
import './mediaLibrary';
import 'what-input';

import type { AppDispatch } from './redux';
import type { CmsConfig } from '../lib/util/index';

const ROOT_ID = 'nc-root';

function ConnectedTranslatedApp() {
  const config = useAppSelector((state: any) => state.config as CmsConfig);
  const locale = useAppSelector((state: any) => selectLocale(state.config));
  return (
    <I18n locale={locale} messages={getPhrases(locale)}>
      <ErrorBoundary showBackup config={config}>
        <App />
      </ErrorBoundary>
    </I18n>
  );
}

function bootstrap(opts: { config?: CmsConfig } = {}) {
  const { config } = opts;

  /**
   * Log the version number.
   */
  if (typeof DECAP_CMS_CORE_VERSION === 'string') {
    console.log(`decap-cms-core ${DECAP_CMS_CORE_VERSION}`);
  }

  /**
   * Get DOM element where app will mount.
   */
  function getRoot() {
    /**
     * Return existing root if found.
     */
    const existingRoot = document.getElementById(ROOT_ID);
    if (existingRoot) {
      return existingRoot;
    }

    /**
     * If no existing root, create and return a new root.
     */
    const newRoot = document.createElement('div');
    newRoot.id = ROOT_ID;
    document.body.appendChild(newRoot);
    return newRoot;
  }

  /**
   * Dispatch config to store if received. This config will be merged into
   * config.yml if it exists, and any portion that produces a conflict will be
   * overwritten.
   */
  const dispatch = store.dispatch as AppDispatch;
  dispatch(
    loadConfig(config, function onLoad() {
      dispatch(authenticateUser());
    }),
  );

  /**
   * Create connected root component.
   */
  function Root() {
    return (
      <React.StrictMode>
        <GlobalStyles />
        <Provider store={store}>
          <ConnectedTranslatedApp />
        </Provider>
      </React.StrictMode>
    );
  }

  /**
   * Render application root.
   */
  const root = createRoot(getRoot());
  root.render(<Root />);
}

export default bootstrap;
