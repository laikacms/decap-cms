import React, { useCallback, useMemo } from 'react';
import { useTranslate } from 'react-polyglot';
import styled from '@emotion/styled';
import { Route, Switch, Redirect } from 'react-router-dom';
import TopBarProgress from 'react-topbar-progress-indicator';
import { Loader, colors } from 'decap-cms-ui-default';

import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { loginUser, logoutUser } from '../../actions/auth';
import { currentBackend } from '../../backend';
import { createNewEntry } from '../../actions/collections';
import { openMediaLibrary } from '../../actions/mediaLibrary';
import MediaLibrary from '../MediaLibrary/MediaLibrary';
import { Notifications } from '../UI';
import { history } from '../../routing/history';
import { EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import Collection from '../Collection/Collection';
import Workflow from '../Workflow/Workflow';
import Editor from '../Editor/Editor';
import NotFoundPage from './NotFoundPage';
import Header from './Header';

import type { Collections, Collection as CollectionType } from '../../types/cms';

TopBarProgress.config({
  barColors: {
    0: colors.active,
    '1.0': colors.active,
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
  const keys = Object.keys(collections.toJS ? collections.toJS() : collections);
  for (const key of keys) {
    const collection = collections.get(key) as CollectionType | undefined;
    if (collection && collection.get('hide') !== true) {
      return `/collections/${collection.get('name')}`;
    }
  }
  throw new Error('Could not find a non hidden collection');
}

interface RouteInCollectionProps {
  collections: Collections;
  render: (props: any) => React.ReactNode;
  exact?: boolean;
  path: string;
}

function RouteInCollection({ collections, render, ...props }: RouteInCollectionProps) {
  const defaultPath = getDefaultPath(collections);
  return (
    <Route
      {...props}
      render={(routeProps: any) => {
        const collectionExists = collections.get(routeProps.match.params.name);
        return collectionExists ? render(routeProps) : <Redirect to={defaultPath} />;
      }}
    />
  );
}

/**
 * Main App component - converted to functional component with Redux hooks
 * Uses useCallback for handlers and useMemo for computed values
 * NO useEffect - all side effects are handled by Redux actions
 */
function App() {
  const t = useTranslate();
  const dispatch = useAppDispatch();

  // Select state from Redux store
  const auth = useAppSelector(state => state.auth);
  const config = useAppSelector(state => state.config);
  const collections = useAppSelector(state => state.collections);
  const isFetching = useAppSelector(state => state.globalUI.isFetching);
  const mediaLibrary = useAppSelector(state => state.mediaLibrary);

  // Derived state
  const user = auth.user;
  const publishMode = config?.publish_mode;
  const useMediaLibraryFlag = !mediaLibrary.get('externalLibrary');
  const showMediaButton = mediaLibrary.get('showMediaButton');

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
    (credentials: unknown) => {
      dispatch(loginUser(credentials));
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    dispatch(logoutUser());
  }, [dispatch]);

  const handleOpenMediaLibrary = useCallback(
    (payload?: Parameters<typeof openMediaLibrary>[0]) => {
      dispatch(openMediaLibrary(payload));
    },
    [dispatch]
  );

  const handleClearHash = useCallback(() => {
    history.replace('/');
  }, []);

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

    return (
      <div>
        <Notifications />
        {React.createElement(backend.authComponent(), {
          onLogin: handleLogin,
          error: auth.error,
          inProgress: auth.isFetching,
          siteId: config?.backend?.site_domain,
          base_url: config?.backend?.base_url,
          authEndpoint: config?.backend?.auth_endpoint,
          config,
          clearHash: handleClearHash,
          t,
        })}
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
        logoUrl={config.logo_url}
        logo={config.logo}
        isTestRepo={config.backend?.name === 'test-repo'}
        showMediaButton={showMediaButton}
      />
      <AppMainContainer>
        {isFetching && <TopBarProgress />}
        <Switch>
          <Redirect exact from="/" to={defaultPath} />
          <Redirect exact from="/search/" to={defaultPath} />
          <RouteInCollection
            exact
            collections={collections}
            path="/collections/:name/search/"
            render={({ match }: any) => <Redirect to={`/collections/${match.params.name}`} />}
          />
          <Redirect
            from="/error=access_denied&error_description=Signups+not+allowed+for+this+instance"
            to={defaultPath}
          />
          {hasWorkflow ? <Route path="/workflow" component={Workflow} /> : null}
          <RouteInCollection
            exact
            collections={collections}
            path="/collections/:name"
            render={(props: any) => <Collection {...props} />}
          />
          <RouteInCollection
            path="/collections/:name/new"
            collections={collections}
            render={(props: any) => <Editor {...props} newRecord />}
          />
          <RouteInCollection
            path="/collections/:name/entries/*"
            collections={collections}
            render={(props: any) => <Editor {...props} />}
          />
          <RouteInCollection
            path="/collections/:name/search/:searchTerm"
            collections={collections}
            render={(props: any) => <Collection {...props} isSearchResults isSingleSearchResult />}
          />
          <RouteInCollection
            collections={collections}
            path="/collections/:name/filter/:filterTerm*"
            render={(props: any) => <Collection {...props} />}
          />
          <Route
            path="/search/:searchTerm"
            render={(props: any) => <Collection {...props} isSearchResults />}
          />
          <RouteInCollection
            path="/edit/:name/:entryName"
            collections={collections}
            render={({ match }: any) => {
              const { name, entryName } = match.params;
              return <Redirect to={`/collections/${name}/entries/${entryName}`} />;
            }}
          />
          <Route component={NotFoundPage} />
        </Switch>
        {useMediaLibraryFlag ? <MediaLibrary /> : null}
      </AppMainContainer>
    </>
  );
}

export default App;
