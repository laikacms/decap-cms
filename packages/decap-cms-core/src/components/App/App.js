import PropTypes from 'prop-types';
import React from 'react';
import { translate } from 'react-polyglot';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { connect } from 'react-redux';
import { Route, Switch, Redirect, Link } from 'react-router-dom';
import { Loader, colors, TopBarProgress } from 'decap-cms-ui-default';

import { loginUser, logoutUser } from '../../actions/auth';
import { currentBackend } from '../../backend';
import { createNewEntry } from '../../actions/collections';
import { openMediaLibrary, closeMediaLibrary } from '../../actions/mediaLibrary';
import MediaLibrary from '../MediaLibrary/MediaLibrary';
import { AlertDialogHost, ConfirmDialogHost, Notifications, PromptDialogHost } from '../UI';
import { history } from '../../routing/history';
import { SIMPLE, EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import Collection from '../Collection/Collection';
import Workflow from '../Workflow/Workflow';
import Editor from '../Editor/Editor';
import NotFoundPage, { NotFoundPage as NotFoundPageBase } from './NotFoundPage';
import Header from './Header';

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

export function getDefaultPath(collections) {
  const first = Object.values(collections).find(collection => collection.hide !== true);
  if (first) {
    return `/collections/${first.name}`;
  } else {
    throw new Error('Could not find a non hidden collection');
  }
}

// `search: false` disables the rate-limit-heavy "load all entries" search feature
// entirely, not just the sidebar CollectionSearch UI (DCMS-391). Routes that would
// trigger a search must check this before rendering the search-driving Collection view.
export function isSearchDisabled(config) {
  return Boolean(config) && config.search === false;
}

export function MediaRoute({ openMediaLibrary, defaultPath }) {
  React.useEffect(() => {
    openMediaLibrary();
  }, [openMediaLibrary]);
  return <Redirect to={defaultPath} />;
}

// Whether a route change should dismiss an open Media Library modal (DCMS-537).
// Address-bar/paste/bookmark/back-forward navigation away from whatever route
// was showing when the modal opened must close it, since nothing else does:
// MediaLibrary only closes from its own × button (see MediaLibrary.js
// handleClose). The one navigation that must NOT trigger this is the `/media`
// deep-link route itself (MediaRoute above): it opens the modal and then
// immediately <Redirect>s to defaultPath in the same update, and that
// self-triggered redirect would otherwise close the modal it just opened.
export function shouldCloseMediaLibraryOnLocationChange(
  prevPathname,
  nextPathname,
  isMediaLibraryVisible,
) {
  return Boolean(
    isMediaLibraryVisible && prevPathname !== nextPathname && prevPathname !== '/media',
  );
}

// The Editor route (`/collections/:name/entries/*` and `/collections/:name/new`)
// keeps the same mounted instance across navigations that only change `:name`
// or the entry slug, because it's the same Route/component at the same
// position in the tree. Editor's lifecycle only ever loads the entry/creates
// the draft on mount (componentDidMount), so switching collection or slug via
// history without a remount left the previous collection's draft rendered
// (and targeted by Save/Delete) under the new collection's header (DCMS-490).
// Keying the element on collection name + slug forces React to unmount the
// old Editor and mount a fresh one for every distinct target, which re-runs
// componentDidMount and guarantees the draft always matches the route.
export function getEditorKey(name, slug) {
  return `${name}/${slug || ''}`;
}

// Determines whether `pathname` is an Editor route (`/collections/:name/new` or
// `/collections/:name/entries/*`) for a collection that actually exists.
// RouteInCollection falls back to NotFoundPage on these routes when the named
// collection is unknown, and that fallback needs the Header/top-nav rendered so
// the user isn't stranded with only a "Back to home" link (DCMS-535).
export function isEditorRoute(pathname, collections) {
  const [, base, collectionName, view] = pathname.split('/');
  return (
    base === 'collections' &&
    (view === 'entries' || view === 'new') &&
    Boolean(collections[collectionName])
  );
}

export function RouteInCollection({ collections, render, t, ...props }) {
  const defaultPath = getDefaultPath(collections);
  return (
    <Route
      {...props}
      render={routeProps => {
        const { name } = routeProps.match.params;
        const collectionExists = collections[name];
        return collectionExists ? (
          render(routeProps)
        ) : (
          <NotFoundPageBase
            t={t}
            collectionName={name}
            backLink={<Link to={defaultPath}>{t('app.notFoundPage.backToHome')}</Link>}
          />
        );
      }}
    />
  );
}

class App extends React.Component {
  static propTypes = {
    auth: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    collections: ImmutablePropTypes.map.isRequired,
    loginUser: PropTypes.func.isRequired,
    logoutUser: PropTypes.func.isRequired,
    user: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    publishMode: PropTypes.oneOf([SIMPLE, EDITORIAL_WORKFLOW]),
    siteId: PropTypes.string,
    useMediaLibrary: PropTypes.bool,
    openMediaLibrary: PropTypes.func.isRequired,
    isMediaLibraryVisible: PropTypes.bool,
    closeMediaLibrary: PropTypes.func.isRequired,
    showMediaButton: PropTypes.bool,
    t: PropTypes.func.isRequired,
    location: PropTypes.shape({ pathname: PropTypes.string }).isRequired,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(App.propTypes, this.props, 'prop', 'App');
  }

  componentDidUpdate(prevProps) {
    if (
      shouldCloseMediaLibraryOnLocationChange(
        prevProps.location.pathname,
        this.props.location.pathname,
        this.props.isMediaLibraryVisible,
      )
    ) {
      this.props.closeMediaLibrary();
    }
  }

  configError(config) {
    const t = this.props.t;
    return (
      <ErrorContainer>
        <h1>{t('app.app.errorHeader')}</h1>
        <div>
          <strong>{t('app.app.configErrors')}:</strong>
          <ErrorCodeBlock>{config.error}</ErrorCodeBlock>
          <span>{t('app.app.checkConfigYml')}</span>
        </div>
      </ErrorContainer>
    );
  }

  handleLogin(credentials) {
    this.props.loginUser(credentials);
  }

  authenticating() {
    const { auth, t } = this.props;
    const backend = currentBackend(this.props.config);

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
          onLogin: this.handleLogin.bind(this),
          error: auth.error,
          inProgress: auth.isFetching,
          base_url: this.props.config.backend.base_url,
          authEndpoint: this.props.config.backend.auth_endpoint,
          config: this.props.config,
          clearHash: () => history.replace('/'),
          t,
        })}
      </div>
    );
  }

  handleLinkClick(event, handler, ...args) {
    event.preventDefault();
    handler(...args);
  }

  render() {
    const {
      user,
      config,
      collections,
      logoutUser,
      isFetching,
      publishMode,
      useMediaLibrary,
      openMediaLibrary,
      t,
      showMediaButton,
      location,
    } = this.props;

    if (config === null) {
      return null;
    }

    if (config.error) {
      return this.configError(config);
    }

    if (config.isFetching) {
      return <Loader active>{t('app.app.loadingConfig')}</Loader>;
    }

    if (user == null) {
      return this.authenticating(t);
    }

    const defaultPath = getDefaultPath(collections);
    const hasWorkflow = publishMode === EDITORIAL_WORKFLOW;

    // Work out if this is an editor route, following the same URL matching as the router.
    const editorRoute = isEditorRoute(location.pathname, collections);

    return (
      <>
        <Notifications />
        <AlertDialogHost />
        <ConfirmDialogHost />
        <PromptDialogHost />
        {!editorRoute && (
          <Header
            user={user}
            collections={collections}
            onCreateEntryClick={createNewEntry}
            onLogoutClick={logoutUser}
            openMediaLibrary={openMediaLibrary}
            hasWorkflow={hasWorkflow}
            displayUrl={config.display_url}
            logoUrl={config.logo_url} // Deprecated, replaced by `logo.src`
            logo={config.logo}
            isTestRepo={config.backend.name === 'test-repo'}
            showMediaButton={showMediaButton}
          />
        )}
        <AppMainContainer>
          {isFetching && <TopBarProgress />}
          <Switch>
            <Redirect exact from="/" to={defaultPath} />
            <Redirect exact from="/search/" to={defaultPath} />
            <Route
              exact
              path="/media"
              render={() => (
                <MediaRoute openMediaLibrary={openMediaLibrary} defaultPath={defaultPath} />
              )}
            />
            <RouteInCollection
              t={t}
              exact
              collections={collections}
              path="/collections/:name/search/"
              render={({ match }) => <Redirect to={`/collections/${match.params.name}`} />}
            />
            <Redirect
              // This happens on Identity + Invite Only + External Provider email not matching
              // the registered user
              from="/error=access_denied&error_description=Signups+not+allowed+for+this+instance"
              to={defaultPath}
            />
            {hasWorkflow ? <Route path="/workflow" component={Workflow} /> : null}
            <RouteInCollection
              t={t}
              exact
              collections={collections}
              path="/collections/:name"
              render={props => <Collection {...props} />}
            />
            <RouteInCollection
              t={t}
              path="/collections/:name/new"
              collections={collections}
              // key forces a full unmount/remount whenever the target collection
              // changes; see getEditorKey (DCMS-490).
              render={props => (
                <Editor {...props} key={getEditorKey(props.match.params.name)} newRecord />
              )}
            />
            <RouteInCollection
              t={t}
              path="/collections/:name/entries/*"
              collections={collections}
              // key forces a full unmount/remount whenever the target collection
              // or slug changes; see getEditorKey (DCMS-490).
              render={props => (
                <Editor
                  {...props}
                  key={getEditorKey(props.match.params.name, props.match.params[0])}
                />
              )}
            />
            <RouteInCollection
              t={t}
              path="/collections/:name/search/:searchTerm"
              collections={collections}
              render={props =>
                isSearchDisabled(config) ? (
                  <Redirect to={`/collections/${props.match.params.name}`} />
                ) : (
                  <Collection {...props} isSearchResults isSingleSearchResult />
                )
              }
            />
            <RouteInCollection
              t={t}
              collections={collections}
              path="/collections/:name/filter/:filterTerm*"
              render={props => <Collection {...props} />}
            />
            <Route
              path="/search/:searchTerm"
              render={props =>
                isSearchDisabled(config) ? (
                  <Redirect to={defaultPath} />
                ) : (
                  <Collection {...props} isSearchResults />
                )
              }
            />
            <RouteInCollection
              t={t}
              path="/edit/:name/:entryName"
              collections={collections}
              render={({ match }) => {
                const { name, entryName } = match.params;
                return <Redirect to={`/collections/${name}/entries/${entryName}`} />;
              }}
            />
            <Route component={NotFoundPage} />
          </Switch>
          {useMediaLibrary ? <MediaLibrary /> : null}
        </AppMainContainer>
      </>
    );
  }
}

function mapStateToProps(state) {
  const { auth, config, collections, globalUI, mediaLibrary } = state;
  const user = auth.user;
  const isFetching = globalUI.isFetching;
  const publishMode = config.publish_mode;
  const useMediaLibrary = !mediaLibrary.get('externalLibrary');
  const showMediaButton = mediaLibrary.get('showMediaButton');
  const isMediaLibraryVisible = mediaLibrary.get('isVisible');
  return {
    auth,
    config,
    collections,
    user,
    isFetching,
    publishMode,
    showMediaButton,
    useMediaLibrary,
    isMediaLibraryVisible,
  };
}

const mapDispatchToProps = {
  openMediaLibrary,
  closeMediaLibrary,
  loginUser,
  logoutUser,
};

export default connect(mapStateToProps, mapDispatchToProps)(translate()(App));
