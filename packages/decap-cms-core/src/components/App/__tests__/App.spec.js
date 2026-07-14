/**
 * Unit tests for the isSearchDisabled route guard (DCMS-391).
 *
 * `search: false` previously only hid the sidebar CollectionSearch UI; the
 * `/search/:searchTerm` and `/collections/:name/search/:searchTerm` routes still
 * rendered the search-driving Collection view (and therefore still triggered the
 * rate-limit-heavy "load all entries" search) even when the config disabled it.
 * isSearchDisabled is what those routes now check before rendering, redirecting
 * away instead when search is disabled.
 */
import React from 'react';
import { fromJS } from 'immutable';
import { Router, Switch, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { render, act } from '@testing-library/react';

import { isSearchDisabled, RouteInCollection, getEditorKey, isEditorRoute } from '../App';

describe('isSearchDisabled', () => {
  it('is disabled when config.search is explicitly false', () => {
    expect(isSearchDisabled({ search: false })).toBe(true);
  });

  it('is enabled when config.search is true', () => {
    expect(isSearchDisabled({ search: true })).toBe(false);
  });

  it('is enabled when config.search is omitted', () => {
    expect(isSearchDisabled({})).toBe(false);
  });

  it('is enabled when config is undefined', () => {
    expect(isSearchDisabled(undefined)).toBe(false);
  });
});

function t(key, options) {
  const strings = {
    'app.notFoundPage.header': 'Not Found',
    'app.notFoundPage.collectionNotFoundHeader': 'Collection "%{name}" not found',
    'app.notFoundPage.backToHome': 'Back to home',
  };
  const template = strings[key] || key;
  return options ? template.replace('%{name}', options.name) : template;
}

// Regression test for DCMS-489: deep-linking to a route in a collection that
// doesn't exist used to silently <Redirect> to the first collection, rewriting
// the URL bar so the NotFoundPage fallback route was never reached. It must
// instead render NotFoundPage in place, leaving the URL untouched.
//
// DCMS-503: that NotFoundPage must also echo the unknown collection name, not
// just a generic "Not Found" header, so a stale/renamed/typo'd URL is obvious.
describe('RouteInCollection', () => {
  const collections = fromJS({
    posts: { name: 'posts' },
  });

  it('renders NotFoundPage naming the unknown collection without redirecting', () => {
    const history = createMemoryHistory({ initialEntries: ['/collections/BOGUS-xyz'] });
    const { getByText, queryByText } = render(
      <Router history={history}>
        <Switch>
          <RouteInCollection
            t={t}
            exact
            collections={collections}
            path="/collections/:name"
            render={() => <div>Collection view</div>}
          />
        </Switch>
      </Router>,
    );

    expect(getByText('Collection "BOGUS-xyz" not found')).toBeInTheDocument();
    expect(queryByText('Not Found')).not.toBeInTheDocument();
    expect(history.location.pathname).toBe('/collections/BOGUS-xyz');
  });

  it('renders the matched route when the collection exists', () => {
    const history = createMemoryHistory({ initialEntries: ['/collections/posts'] });
    const { getByText } = render(
      <Router history={history}>
        <Switch>
          <RouteInCollection
            t={t}
            exact
            collections={collections}
            path="/collections/:name"
            render={() => <div>Collection view</div>}
          />
        </Switch>
      </Router>,
    );

    expect(getByText('Collection view')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/collections/posts');
  });
});

// Regression tests for DCMS-535: the Header/top-nav must stay visible when an
// Editor-shaped route (`/new` or `/entries/*`) points at a collection that
// doesn't exist, because RouteInCollection falls back to NotFoundPage in that
// case and the user would otherwise be stranded with only a "Back to home" link.
describe('isEditorRoute', () => {
  const collections = fromJS({
    posts: { name: 'posts' },
  });

  it('is true for a /new route on an existing collection', () => {
    expect(isEditorRoute('/collections/posts/new', collections)).toBe(true);
  });

  it('is true for an /entries/* route on an existing collection', () => {
    expect(isEditorRoute('/collections/posts/entries/some-slug', collections)).toBe(true);
  });

  it('is false for a /new route on an unknown collection', () => {
    expect(isEditorRoute('/collections/does-not-exist/new', collections)).toBe(false);
  });

  it('is false for an /entries/* route on an unknown collection', () => {
    expect(isEditorRoute('/collections/does-not-exist/entries/anything', collections)).toBe(false);
  });

  it('is false for the list route even on an existing collection', () => {
    expect(isEditorRoute('/collections/posts', collections)).toBe(false);
  });
});

// Regression tests for DCMS-490: navigating between the Editor route for one
// collection/entry to another used to keep the same mounted Editor instance
// (only `:name`/slug changed), so componentDidMount never re-ran and the
// previous entry's draft stayed on screen under the new collection's header,
// with Save/Delete still targeting the stale entry. getEditorKey is what App
// uses to key the <Editor> element so React remounts it on every distinct
// collection/entry target.
describe('getEditorKey', () => {
  it('differs when the collection name changes', () => {
    expect(getEditorKey('faq', 'entry-1')).not.toBe(getEditorKey('pages', 'entry-1'));
  });

  it('differs when the slug changes', () => {
    expect(getEditorKey('faq', 'entry-1')).not.toBe(getEditorKey('faq', 'entry-2'));
  });

  it('is stable for the same collection and slug', () => {
    expect(getEditorKey('faq', 'entry-1')).toBe(getEditorKey('faq', 'entry-1'));
  });

  it('treats a missing slug (new entry route) as distinct per collection', () => {
    expect(getEditorKey('faq', undefined)).not.toBe(getEditorKey('pages', undefined));
  });
});

describe('Editor route remount on collection/slug change', () => {
  // Minimal stand-in for the real Editor: what matters for this regression is
  // only that componentDidMount fires again (i.e. the instance remounted),
  // which is what makes loadEntry/createEmptyDraft re-run against the new
  // route params instead of leaving a stale draft rendered.
  class TrackedEditor extends React.Component {
    componentDidMount() {
      this.props.onMount(`${this.props.match.params.name}/${this.props.match.params[0] || ''}`);
    }
    render() {
      return (
        <div>
          Editing {this.props.match.params.name}/{this.props.match.params[0]}
        </div>
      );
    }
  }

  it('remounts (fresh componentDidMount) when navigating to a different collection/entry', () => {
    const history = createMemoryHistory({
      initialEntries: ['/collections/faq/entries/entry-1'],
    });
    const mounts = [];
    function onMount(key) {
      mounts.push(key);
    }

    const { getByText } = render(
      <Router history={history}>
        <Switch>
          <Route
            path="/collections/:name/entries/*"
            render={props => (
              <TrackedEditor
                {...props}
                key={getEditorKey(props.match.params.name, props.match.params[0])}
                onMount={onMount}
              />
            )}
          />
        </Switch>
      </Router>,
    );

    expect(getByText('Editing faq/entry-1')).toBeInTheDocument();
    expect(mounts).toEqual(['faq/entry-1']);

    act(() => {
      history.push('/collections/pages/entries/does-not-exist');
    });

    // A fresh instance mounted for the new collection/entry (second
    // componentDidMount call) rather than the "faq/entry-1" instance being
    // reused for "pages/does-not-exist".
    expect(getByText('Editing pages/does-not-exist')).toBeInTheDocument();
    expect(mounts).toEqual(['faq/entry-1', 'pages/does-not-exist']);
  });
});
