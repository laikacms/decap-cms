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
import type { ErrorBoundaryRenderProps } from '../UI';
import { EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import CollectionComponent from '../Collection/Collection';
import Workflow from '../Workflow/Workflow';
import Editor from '../Editor/Editor';
import NotFoundPage from './NotFoundPage';
import Header from './Header';

import type { CmsConfig, CmsCredentials } from '../../../lib-util/index';
import type { CmsCollectionState, CmsCollections } from '../../../lib-util/index';
import type { TranslateFunction } from '../../../ui-default/index';
import { CmsSlotsProvider } from '../../lib/slots';
import type { CmsSlots } from '../../lib/slots';

type Collection = CmsCollectionState;
type Collections = CmsCollections;

/**
 * Props passed to a custom header renderer. Consumers that supply `renderHeader`
 * to `AppContent` receive these — everything the default `Header` reads off of
 * Redux is pre-resolved so the renderer stays a plain function.
 */
export interface AppHeaderRenderProps {
  user: { avatar_url?: string; [key: string]: unknown };
  collections: Collections;
  onCreateEntryClick: (collectionName: string) => void;
  onLogoutClick: () => void;
  openMediaLibrary: () => void;
  hasWorkflow: boolean;
  displayUrl?: string;
  showMediaButton?: boolean;
  logoUrl?: string;
  logo?: { src: string; show_in_header?: boolean };
  isTestRepo?: boolean;
}

/**
 * Props passed to a custom layout renderer. The `main` slot is the routed
 * content (collections / editor / workflow / media library wrapper) already
 * fully composed; consumers wrap it in whatever shell they want (sidebar,
 * dashboard, breadcrumbs, footer). `headerProps` is the same payload supplied
 * to `renderHeader` so a layout can co-render auxiliary nav from the same
 * source of truth.
 */
export interface AppLayoutRenderProps {
  main: React.ReactNode;
  headerProps: AppHeaderRenderProps;
}

/**
 * Props passed to a custom auth-page renderer. Receives the backend-supplied
 * `AuthComponent` already constructed plus the handlers + state the default
 * page wires into it; `AuthComponent` is `null` while the backend is still
 * being resolved. Consumers can wrap, restyle, or fully replace the page.
 */
export interface AppAuthRenderProps {
  AuthComponent: React.ComponentType<Record<string, unknown>> | null;
  onLogin: (credentials: CmsCredentials) => void;
  error?: string | null;
  inProgress?: boolean;
  config: CmsConfig;
  clearHash: () => void;
  t: TranslateFunction;
}

export interface AppContentProps {
  /**
   * Render a custom header in place of the default Decap header. Receives the
   * same props the built-in `Header` consumes — auth user, collections, the
   * media/quick-add/logout handlers, etc. Omit to use the default header.
   */
  renderHeader?: (props: AppHeaderRenderProps) => React.ReactNode;
  /**
   * Wrap the routed main content (everything below the header) in a custom
   * layout — e.g. add a left sidebar, change the container width, inject a
   * dashboard. Receives the already-composed routed content as `main`. Omit
   * to use the default centered container.
   */
  renderLayout?: (props: AppLayoutRenderProps) => React.ReactNode;
  /**
   * Render a custom authentication page (or a wrapper around the backend's
   * built-in one). Receives the backend's `AuthComponent` plus the standard
   * login handlers. When `AuthComponent` is `null` the backend is still being
   * resolved — show a waiting state or fall back. Omit for the default page.
   */
  renderAuth?: (props: AppAuthRenderProps) => React.ReactNode;
  /**
   * Replace the element rendered at `/`. By default, `/` redirects to the
   * first non-hidden collection. Supply this to render a dashboard, an
   * onboarding screen, or any other home view instead.
   */
  renderRoot?: () => React.ReactNode;
  /**
   * Inject additional `<Route>` elements into the router, just before the
   * catch-all `NotFoundPage` route. Use to add custom pages (settings,
   * analytics, docs). React-router walks fragments and arrays, so any group
   * of `<Route>` elements is fine here.
   */
  extraRoutes?: React.ReactNode;
  /**
   * Render-slot overrides for deeper components (Collection, Editor,
   * MediaLibrary, …). See `CmsSlots`. Omit to use the defaults everywhere.
   */
  slots?: CmsSlots;
  /**
   * Replace the toast notifications surface. Called from both the auth and
   * post-login render paths, so a single override re-skins notifications
   * everywhere. Omit to use the default `Notifications` component.
   */
  renderNotifications?: () => React.ReactNode;
  /**
   * Replace the 404 / not-found page rendered for unmatched routes. Omit to
   * use the default `NotFoundPage`.
   */
  renderNotFound?: () => React.ReactNode;
  /**
   * Render a footer below the routed content (still inside the layout, so
   * `renderLayout` controls the surrounding chrome). Omit for no footer.
   */
  renderFooter?: () => React.ReactNode;
  /**
   * Replace the screen shown while the CMS config is being loaded. Omit to
   * use the default `Loader` component.
   */
  renderConfigLoading?: () => React.ReactNode;
  /**
   * Replace the screen shown when the CMS config has an error. Receives the
   * raw error message string. Omit for the default error block.
   */
  renderConfigError?: (props: { error: string }) => React.ReactNode;
  /**
   * Replace the crash-fallback screen rendered by the root `ErrorBoundary`.
   * Receives the error title, full message/stack, a pre-built Github issue
   * URL, and (when `showBackup` is on) the recovered draft JSON.
   */
  renderError?: (props: ErrorBoundaryRenderProps) => React.ReactNode;
}

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
function AppContent({
  renderHeader,
  renderLayout,
  renderAuth,
  renderRoot,
  extraRoutes,
  slots,
  renderNotifications,
  renderNotFound,
  renderFooter,
  renderConfigLoading,
  renderConfigError,
}: AppContentProps = {}) {
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
  const renderDefaultConfigError = useCallback(() => {
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
    const AuthComponent =
      backend == null
        ? null
        : (backend.authComponent() as any as React.ComponentType<Record<string, unknown>>);

    if (renderAuth) {
      return (
        <>
          {renderNotifications ? renderNotifications() : <Notifications />}
          {renderAuth({
            AuthComponent,
            onLogin: handleLogin,
            error: auth.error,
            inProgress: auth.isFetching,
            config: config as CmsConfig,
            clearHash: handleClearHash,
            t,
          })}
        </>
      );
    }

    if (AuthComponent == null) {
      return (
        <div>
          <h1>{t('app.app.waitingBackend')}</h1>
        </div>
      );
    }

    return (
      <div>
        {renderNotifications ? renderNotifications() : <Notifications />}
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
  }, [
    config,
    auth.error,
    auth.isFetching,
    handleLogin,
    handleClearHash,
    t,
    renderAuth,
    renderNotifications,
  ]);

  // Early returns for loading/error states
  if (config === null) {
    return null;
  }

  if (config.error) {
    return renderConfigError
      ? <>{renderConfigError({ error: config.error })}</>
      : renderDefaultConfigError();
  }

  if (config.isFetching) {
    return renderConfigLoading
      ? <>{renderConfigLoading()}</>
      : <Loader active>{t('app.app.loadingConfig')}</Loader>;
  }

  if (user == null) {
    return renderAuthenticating();
  }

  const headerProps: AppHeaderRenderProps = {
    user,
    collections,
    onCreateEntryClick: createNewEntry,
    onLogoutClick: handleLogout,
    openMediaLibrary: handleOpenMediaLibrary,
    hasWorkflow,
    displayUrl: config.display_url,
    logoUrl: config.logo?.src,
    logo: config.logo,
    isTestRepo: config.backend?.name === 'test-repo',
    showMediaButton,
  };

  const routedContent = (
    <>
      {isFetching && <TopBarProgress />}
      <Routes>
          <Route
            path="/"
            element={renderRoot ? <>{renderRoot()}</> : <Navigate to={defaultPath} replace />}
          />
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
          {extraRoutes}
          <Route
            path="*"
            element={renderNotFound ? <>{renderNotFound()}</> : <NotFoundPage />}
          />
        </Routes>
        {useMediaLibraryFlag ? <MediaLibrary /> : null}
        {renderFooter ? renderFooter() : null}
    </>
  );

  return (
    <CmsSlotsProvider slots={slots}>
      {renderNotifications ? renderNotifications() : <Notifications />}
      {renderHeader ? renderHeader(headerProps) : <Header {...headerProps} />}
      {renderLayout ? (
        renderLayout({ main: routedContent, headerProps })
      ) : (
        <AppMainContainer>{routedContent}</AppMainContainer>
      )}
    </CmsSlotsProvider>
  );
}

/**
 * The default, self-contained Decap CMS app. Provides its own router and error
 * boundary, so it only needs a `DecapCmsProvider` ancestor. For a custom
 * layout, render `AppContent` (or individual page components) inside your own
 * router instead.
 */
function App({
  renderHeader,
  renderLayout,
  renderAuth,
  renderRoot,
  extraRoutes,
  slots,
  renderNotifications,
  renderNotFound,
  renderFooter,
  renderConfigLoading,
  renderConfigError,
  renderError,
}: AppContentProps = {}) {
  const config = useAppSelector(state => state.config);
  return (
    <ErrorBoundary showBackup config={config} renderError={renderError}>
      <HistoryRouter history={history as any}>
        <AppContent
          renderHeader={renderHeader}
          renderLayout={renderLayout}
          renderAuth={renderAuth}
          renderRoot={renderRoot}
          extraRoutes={extraRoutes}
          slots={slots}
          renderNotifications={renderNotifications}
          renderNotFound={renderNotFound}
          renderFooter={renderFooter}
          renderConfigLoading={renderConfigLoading}
          renderConfigError={renderConfigError}
        />
      </HistoryRouter>
    </ErrorBoundary>
  );
}

export default App;
export { AppContent };
