import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslate } from 'react-polyglot';
import styled from '@emotion/styled';
import TopBarProgress from 'react-topbar-progress-indicator';

import { Loader, colorsDefaults } from '../../../ui-default/index';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { loginUser, logoutUser } from '../../actions/auth';
import { currentBackend } from '../../backend';
import { createNewEntry } from '../../actions/collections';
import { openMediaLibrary } from '../../actions/mediaLibrary';
import MediaLibrary from '../MediaLibrary/MediaLibrary';
import { Notifications, ErrorBoundary } from '../UI';
import { EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import CollectionComponent from '../Collection/Collection';
import Workflow from '../Workflow/Workflow';
import Editor from '../Editor/Editor';
import NotFoundPage from './NotFoundPage';
import Header from './Header';
import { CmsSlotsProvider } from '../../lib/slots';
import { useDecap } from '../../hooks/useDecap';
import { useNavigate } from '../../hooks/useNavigate';
import { matchRoute } from '../../routing/router';

import type { CmsConfig, CmsCredentials } from '../../../lib-util/index';
import type { CmsCollectionState, CmsCollections } from '../../../lib-util/index';
import type { TranslateFunction } from '../../../ui-default/index';
import type { ErrorBoundaryRenderProps } from '../UI';
import type { CmsSlots } from '../../lib/slots';

type Collection = CmsCollectionState;
type Collections = CmsCollections;

/**
 * A consumer-injected route: rendered when the current location path equals
 * `path` exactly. Kept intentionally simple (exact match, no params) — richer
 * matching can be added to the routing table when a use case needs it.
 */
export interface ExtraRoute {
  path: string;
  element: React.ReactNode;
}

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
  /**
   * `true` while the current route is an entry editor (`entryNew` / `entry`).
   * The editor renders its own full-bleed header/toolbar that visually covers
   * the app-shell chrome (DCMS-431), so a custom layout that also renders its
   * own persistent nav (e.g. a sidebar) can use this to avoid stacking a
   * second layer of dead-but-focusable controls under the editor.
   */
  isEditorRoute: boolean;
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
   * Inject additional routes, matched (by exact path) after the built-in
   * routes and before the catch-all not-found page. Use to add custom pages
   * (settings, analytics, docs).
   */
  extraRoutes?: ExtraRoute[];
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

function getDefaultCollectionName(collections: Collections): string | undefined {
  // First non-hidden collection; used as the home/redirect target.
  for (const key of Object.keys(collections)) {
    const collection = collections[key] as Collection | undefined;
    if (collection && collection.hide !== true) {
      return collection.name;
    }
  }
  return undefined;
}

/**
 * Imperatively redirect to a collection's entry list, replacing the current
 * history entry. Renders nothing; the navigation happens in an effect so it
 * does not run during render. A no-op when there is no default collection.
 */
function RedirectToCollection({ collectionName }: { collectionName?: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (collectionName) {
      navigate('collection', { collectionName }, { replace: true });
    }
  }, [navigate, collectionName]);
  return null;
}

/**
 * Imperatively redirect to an entry editor, replacing the current history
 * entry — backs the legacy `/edit/:name/:entryName` route.
 */
function RedirectToEntry({ collectionName, slug }: { collectionName: string; slug: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('entry', { collectionName, slug }, { replace: true });
  }, [navigate, collectionName, slug]);
  return null;
}

/**
 * Renders `children` only if `name` is an existing collection; otherwise
 * renders the not-found page naming the missing collection (DCMS-432).
 * Previously this silently redirected (and rewrote the URL bar) to the
 * default collection, which gave the user no signal that the deep-linked
 * collection did not exist — replaces react-router's per-route existence
 * guard, but without the silent fallback.
 */
function CollectionGuard({
  name,
  collections,
  renderNotFound,
  children,
}: {
  name: string;
  collections: Collections;
  renderNotFound?: () => React.ReactNode;
  children: React.ReactNode;
}) {
  const exists = name ? collections[name] : undefined;
  if (!exists) {
    return renderNotFound ? <>{renderNotFound()}</> : <NotFoundPage collectionName={name} />;
  }
  return <>{children}</>;
}

/**
 * Adapts the routing-table params to the `match.params` shape `Collection`
 * expects (it reads `name` / `searchTerm` / `filterTerm`).
 */
function CollectionView({
  name,
  searchTerm,
  filterTerm,
  isSearchResults,
  isSingleSearchResult,
}: {
  name?: string;
  searchTerm?: string;
  filterTerm?: string;
  isSearchResults?: boolean;
  isSingleSearchResult?: boolean;
}) {
  return (
    <CollectionComponent
      match={{ params: { name, searchTerm, filterTerm } }}
      isSearchResults={isSearchResults}
      isSingleSearchResult={isSingleSearchResult}
    />
  );
}

/**
 * The table-driven route switch that replaces react-router's `<Routes>`. Reads
 * the current path from the routing context, finds the matching table entry,
 * and renders the corresponding page — applying the collection-existence guard
 * and legacy redirects the old route tree encoded.
 */
function AppRoutes({
  collections,
  hasWorkflow,
  renderRoot,
  renderNotFound,
  extraRoutes,
  defaultCollectionName,
}: {
  collections: Collections;
  hasWorkflow: boolean;
  renderRoot?: () => React.ReactNode;
  renderNotFound?: () => React.ReactNode;
  extraRoutes?: ExtraRoute[];
  defaultCollectionName?: string;
}) {
  const { routing, path } = useDecap();

  // OAuth "signups not allowed" bounces back here as a path; send it home.
  if (path.startsWith('/error=')) {
    return <RedirectToCollection collectionName={defaultCollectionName} />;
  }

  // Bare search URLs with no term (an empty search box submit): go home.
  if (path === '/search' || path === '/search/') {
    return <RedirectToCollection collectionName={defaultCollectionName} />;
  }
  const bareCollectionSearch = path.match(/^\/collections\/([^/]+)\/search\/?$/);
  if (bareCollectionSearch) {
    return <RedirectToCollection collectionName={bareCollectionSearch[1]} />;
  }

  const match = matchRoute(routing, path);

  if (!match) {
    const extra = extraRoutes?.find(route => route.path === path);
    if (extra) {
      return <>{extra.element}</>;
    }
    return renderNotFound ? <>{renderNotFound()}</> : <NotFoundPage />;
  }

  switch (match.key) {
    case 'root':
      return renderRoot ? (
        <>{renderRoot()}</>
      ) : (
        <RedirectToCollection collectionName={defaultCollectionName} />
      );
    case 'workflow':
      return hasWorkflow ? (
        <Workflow />
      ) : (
        <RedirectToCollection collectionName={defaultCollectionName} />
      );
    case 'collection':
      return (
        <CollectionGuard
          collections={collections}
          name={match.params.collectionName}
          renderNotFound={renderNotFound}
        >
          <CollectionView name={match.params.collectionName} />
        </CollectionGuard>
      );
    case 'collectionSearch':
      return (
        <CollectionGuard
          collections={collections}
          name={match.params.collectionName}
          renderNotFound={renderNotFound}
        >
          <CollectionView
            name={match.params.collectionName}
            searchTerm={match.params.searchTerm}
            isSearchResults
            isSingleSearchResult
          />
        </CollectionGuard>
      );
    case 'collectionFilter':
      return (
        <CollectionGuard
          collections={collections}
          name={match.params.collectionName}
          renderNotFound={renderNotFound}
        >
          <CollectionView
            name={match.params.collectionName}
            filterTerm={match.params.filterTerm}
          />
        </CollectionGuard>
      );
    case 'search':
      return <CollectionView searchTerm={match.params.searchTerm} isSearchResults />;
    case 'entryNew':
      return (
        <CollectionGuard
          collections={collections}
          name={match.params.collectionName}
          renderNotFound={renderNotFound}
        >
          <Editor newRecord collectionName={match.params.collectionName} />
        </CollectionGuard>
      );
    case 'entry':
      return (
        <CollectionGuard
          collections={collections}
          name={match.params.collectionName}
          renderNotFound={renderNotFound}
        >
          <Editor collectionName={match.params.collectionName} slug={match.params.slug} />
        </CollectionGuard>
      );
    case 'editRedirect':
      return (
        <CollectionGuard
          collections={collections}
          name={match.params.collectionName}
          renderNotFound={renderNotFound}
        >
          <RedirectToEntry
            collectionName={match.params.collectionName}
            slug={match.params.slug}
          />
        </CollectionGuard>
      );
    default:
      return renderNotFound ? <>{renderNotFound()}</> : <NotFoundPage />;
  }
}

/**
 * `true` for the two routes the entry editor renders on (`entryNew` / `entry`).
 * The editor takes over the full viewport with its own header + toolbar
 * (`EditorInterface`'s `EditorContainer` is `position: absolute; top: 0`), so
 * the app-shell header must not stay mounted underneath it — otherwise its
 * nav links remain in the DOM (focusable, tab-reachable) while being visually
 * painted over, hit-testing to the editor's own controls instead (DCMS-431).
 */
function isEditorRouteKey(key: string | undefined): boolean {
  return key === 'entryNew' || key === 'entry';
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
  const { routing, path } = useDecap();

  // Select state from Redux store
  const auth = useAppSelector(state => state.auth);
  const config = useAppSelector(state => state.config);
  const collections = useAppSelector(state => state.collections);
  const isFetching = useAppSelector(state => state.globalUI.isFetching);
  const mediaLibrary = useAppSelector(state => state.mediaLibrary);

  // Drives whether the app-shell header mounts at all (DCMS-431) — see
  // `isEditorRouteKey`.
  const isEditorRoute = useMemo(
    () => isEditorRouteKey(matchRoute(routing, path)?.key),
    [routing, path],
  );

  // Derived state
  const user = auth.user;
  const publishMode = config?.publish_mode;
  const useMediaLibraryFlag = !mediaLibrary.externalLibrary;
  const showMediaButton = mediaLibrary.showMediaButton;

  // Memoized values
  const defaultCollectionName = useMemo(
    () => (collections ? getDefaultCollectionName(collections) : undefined),
    [collections],
  );

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
    navigate('root', undefined, { replace: true });
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
    return renderConfigError ? (
      <>{renderConfigError({ error: config.error })}</>
    ) : (
      renderDefaultConfigError()
    );
  }

  if (config.isFetching) {
    return renderConfigLoading ? (
      <>{renderConfigLoading()}</>
    ) : (
      <Loader active>{t('app.app.loadingConfig')}</Loader>
    );
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
      <AppRoutes
        collections={collections}
        hasWorkflow={hasWorkflow}
        renderRoot={renderRoot}
        renderNotFound={renderNotFound}
        extraRoutes={extraRoutes}
        defaultCollectionName={defaultCollectionName}
      />
      {useMediaLibraryFlag ? <MediaLibrary /> : null}
      {renderFooter ? renderFooter() : null}
    </>
  );

  return (
    <CmsSlotsProvider slots={slots}>
      {renderNotifications ? renderNotifications() : <Notifications />}
      {/* The entry editor renders its own full-bleed header/toolbar over the
          same viewport region as the app-shell header (`position: absolute;
          top: 0`) — mounting both leaves invisible-yet-focusable nav controls
          in the DOM that hit-test to the editor instead (DCMS-431). Unmount
          the app header entirely while an editor route is active rather than
          layering a z-index/pointer-events patch on top of it. */}
      {!isEditorRoute &&
        (renderHeader ? renderHeader(headerProps) : <Header {...headerProps} />)}
      {renderLayout ? (
        renderLayout({ main: routedContent, headerProps, isEditorRoute })
      ) : (
        <AppMainContainer>{routedContent}</AppMainContainer>
      )}
    </CmsSlotsProvider>
  );
}

/**
 * The default, self-contained Decap CMS app: the routed UI wrapped in the root
 * error boundary. Routing/config come from the `DecapCmsProvider` ancestor
 * (which owns the routing context), so this only needs to be rendered inside
 * one. For a custom layout, render `AppContent` (or individual page
 * components) yourself instead.
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
    </ErrorBoundary>
  );
}

export default App;
export { AppContent };
