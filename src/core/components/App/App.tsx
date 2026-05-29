import React, { useCallback, useMemo } from 'react';
import { useTranslate } from 'react-polyglot';
import styled from '@emotion/styled';
import {
  Route,
  Routes,
  Navigate,
  useParams,
  useNavigate,
  unstable_HistoryRouter as HistoryRouter,
} from 'react-router-dom';
import TopBarProgress from 'react-topbar-progress-indicator';
import { Loader, colorsDefaults } from '../../../ui-default/index';

import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { loginUser, logoutUser } from '../../actions/auth';
import { currentBackend } from '../../backend';
import { createNewEntry } from '../../actions/collections';
import { openMediaLibrary } from '../../actions/mediaLibrary';
import { history } from '../../routing/history';
import MediaLibrary from '../MediaLibrary/MediaLibrary';
import { Notifications, ErrorBoundary } from '../UI';
import { EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import CollectionComponent from '../Collection/Collection';
import Workflow from '../Workflow/Workflow';
import Editor from '../Editor/Editor';
import NotFoundPage from './NotFoundPage';
import Header from './Header';

import type { CmsCredentials } from '../../../lib-util/index';
import type { CmsCollectionState, CmsCollections } from '../../../lib-util/index';

type Collection = CmsCollectionState;
type Collections = CmsCollections;

TopBarProgress.config({
  // Rendered to a <canvas>, which cannot resolve CSS `var()` tokens — use the
  // raw default color value here.
  barColors: {
    0: colorsDefaults.active,
    '1.0': colorsDefaults.active,
  },
  shadowBlur: 0,
  barThickness: 2,
});

const AppMainContainer = styled.div`
  min-width: 800px;
  max-width: 1440px;
  margin: 0 auto;
`;

const ErrorContainer = styled.div`
  margin: 20px;
`;

const ErrorCodeBlock = styled.pre`
  margin-left: 20px;
  font-size: 15px;
  line-height: 1.5;
`;

function getDefaultPath(collections: Collections): string {
  // Get all collection keys and find the first non-hidden one
  const keys = Object.keys(collections);
  for (const key of keys) {
    const collection = collections[key] as Collection | undefined;
    if (collection && collection.hide !== true) {
      return `/collections/${collection.name}`;
    }
  }
  throw new Error('Could not find a non hidden collection');
}

/**
 * Helper component that checks if a collection exists and redirects if not.
 * Used as a wrapper element for Route in react-router v7.
 */
function RouteInCollectionGuard({
  collections,
  children,
}: {
  collections: Collections;
  children: React.ReactNode;
}) {
  const { name } = useParams<{ name: string }>();
  const defaultPath = getDefaultPath(collections);
  const collectionExists = name ? collections[name] : undefined;
  return collectionExists ? <>{children}</> : <Navigate to={defaultPath} replace />;
}

/**
 * Wrapper that bridges useParams to the match prop expected by Collection.
 */
function CollectionRoute({
  isSearchResults,
  isSingleSearchResult,
}: {
  isSearchResults?: boolean;
  isSingleSearchResult?: boolean;
}) {
  const params = useParams();
  const filterTerm = params['*'] || params.filterTerm;
  const match = {
    params: { ...params, filterTerm } as {
      name?: string;
      searchTerm?: string;
      filterTerm?: string;
    },
  };
  return (
    <CollectionComponent
      match={match}
      isSearchResults={isSearchResults}
      isSingleSearchResult={isSingleSearchResult}
    />
  );
}

/**
 * Wrapper for the Editor component in route context.
 */
function EditorRoute({ newRecord }: { newRecord?: boolean }) {
  return <Editor newRecord={newRecord} />;
}

/**
 * Redirect helper for search route within a collection
 */
function CollectionSearchRedirect() {
  const { name } = useParams<{ name: string }>();
  return <Navigate to={`/collections/${name}`} replace />;
}

/**
 * Redirect helper for edit route
 */
function EditRedirect() {
  const { name, entryName } = useParams<{ name: string; entryName: string }>();
  return <Navigate to={`/collections/${name}/entries/${entryName}`} replace />;
}

/**
 * Main App component - converted to functional component with Redux hooks
 * Uses useCallback for handlers and useMemo for computed values
 * NO useEffect - all side effects are handled by Redux actions
 */
/**
 * The default Decap CMS UI: header, notifications, media library and the
 * routed collection/editor/workflow pages. It requires a router ancestor —
 * render it directly when you supply your own router, or use the default
 * `App` export which provides one.
 */
function AppContent() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Select state from Redux store
  const auth = useAppSelector(state => state.auth);
  const config = useAppSelector(state => state.config);
  const collections = useAppSelector(state => state.collections);
  const isFetching = useAppSelector(state => state.globalUI.isFetching);
  const mediaLibrary = useAppSelector(state => state.mediaLibrary);

  // Derived state
  const user = auth.user;
  const publishMode = config?.publish_mode;
  const useMediaLibraryFlag = !mediaLibrary.externalLibrary;
  const showMediaButton = mediaLibrary.showMediaButton;

  // Memoized values
  const defaultPath = useMemo(() => {
    if (collections) {
      try {
        return getDefaultPath(collections);
      } catch {
        return '/';
      }
    }
    return '/';
  }, [collections]);

  const hasWorkflow = useMemo(() => publishMode === EDITORIAL_WORKFLOW, [publishMode]);

  // Handlers using useCallback
  const handleLogin = useCallback(
    (credentials: CmsCredentials) => {
      dispatch(loginUser(credentials));
    },
    [dispatch],
  );

  const handleLogout = useCallback(() => {
    dispatch(logoutUser());
  }, [dispatch]);

  const handleOpenMediaLibrary = useCallback(
    (payload?: Parameters<typeof openMediaLibrary>[0]) => {
      dispatch(openMediaLibrary(payload));
    },
    [dispatch],
  );

  const handleClearHash = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  // Render helpers
  const renderConfigError = useCallback(() => {
    return (
      <ErrorContainer>
        <h1>{t('app.app.errorHeader')}</h1>
        <div>
          <strong>{t('app.app.configErrors')}:</strong>
          <ErrorCodeBlock>{config?.error}</ErrorCodeBlock>
          <span>{t('app.app.checkConfigYml')}</span>
        </div>
      </ErrorContainer>
    );
  }, [t, config?.error]);

  const renderAuthenticating = useCallback(() => {
    const backend = currentBackend(config);

    if (backend == null) {
      return (
        <div>
          <h1>{t('app.app.waitingBackend')}</h1>
        </div>
      );
    }

    const AuthComponent = backend.authComponent() as any as React.ComponentType<any>;

    return (
      <div>
        <Notifications />
        <AuthComponent
          onLogin={handleLogin}
          error={auth.error}
          inProgress={auth.isFetching}
          siteId={config?.backend?.site_domain}
          base_url={config?.backend?.base_url}
          authEndpoint={config?.backend?.auth_endpoint}
          config={config}
          clearHash={handleClearHash}
          t={t}
        />
      </div>
    );
  }, [config, auth.error, auth.isFetching, handleLogin, handleClearHash, t]);

  // Early returns for loading/error states
  if (config === null) {
    return null;
  }

  if (config.error) {
    return renderConfigError();
  }

  if (config.isFetching) {
    return <Loader active>{t('app.app.loadingConfig')}</Loader>;
  }

  if (user == null) {
    return renderAuthenticating();
  }

  return (
    <>
      <Notifications />
      <Header
        user={user}
        collections={collections}
        onCreateEntryClick={createNewEntry}
        onLogoutClick={handleLogout}
        openMediaLibrary={handleOpenMediaLibrary}
        hasWorkflow={hasWorkflow}
        displayUrl={config.display_url}
        logoUrl={config.logo?.src}
        logo={config.logo}
        isTestRepo={config.backend?.name === 'test-repo'}
        showMediaButton={showMediaButton}
      />
      <AppMainContainer>
        {isFetching && <TopBarProgress />}
        <Routes>
          <Route path="/" element={<Navigate to={defaultPath} replace />} />
          <Route path="/search/" element={<Navigate to={defaultPath} replace />} />
          <Route
            path="/collections/:name/search/"
            element={
              <RouteInCollectionGuard collections={collections}>
                <CollectionSearchRedirect />
              </RouteInCollectionGuard>
            }
          />
          <Route
            path="/error=access_denied&error_description=Signups+not+allowed+for+this+instance"
            element={<Navigate to={defaultPath} replace />}
          />
          {hasWorkflow ? <Route path="/workflow" element={<Workflow />} /> : null}
          <Route
            path="/collections/:name"
            element={
              <RouteInCollectionGuard collections={collections}>
                <CollectionRoute />
              </RouteInCollectionGuard>
            }
          />
          <Route
            path="/collections/:name/new"
            element={
              <RouteInCollectionGuard collections={collections}>
                <EditorRoute newRecord />
              </RouteInCollectionGuard>
            }
          />
          <Route
            path="/collections/:name/entries/*"
            element={
              <RouteInCollectionGuard collections={collections}>
                <EditorRoute />
              </RouteInCollectionGuard>
            }
          />
          <Route
            path="/collections/:name/search/:searchTerm"
            element={
              <RouteInCollectionGuard collections={collections}>
                <CollectionRoute isSearchResults isSingleSearchResult />
              </RouteInCollectionGuard>
            }
          />
          <Route
            path="/collections/:name/filter/*"
            element={
              <RouteInCollectionGuard collections={collections}>
                <CollectionRoute />
              </RouteInCollectionGuard>
            }
          />
          <Route path="/search/:searchTerm" element={<CollectionRoute isSearchResults />} />
          <Route
            path="/edit/:name/:entryName"
            element={
              <RouteInCollectionGuard collections={collections}>
                <EditRedirect />
              </RouteInCollectionGuard>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {useMediaLibraryFlag ? <MediaLibrary /> : null}
      </AppMainContainer>
    </>
  );
}

/**
 * The default, self-contained Decap CMS app. Provides its own router and error
 * boundary, so it only needs a `DecapCmsProvider` ancestor. For a custom
 * layout, render `AppContent` (or individual page components) inside your own
 * router instead.
 */
function App() {
  const config = useAppSelector(state => state.config);
  return (
    <ErrorBoundary showBackup config={config}>
      <HistoryRouter history={history as any}>
        <AppContent />
      </HistoryRouter>
    </ErrorBoundary>
  );
}

export default App;
export { AppContent };
