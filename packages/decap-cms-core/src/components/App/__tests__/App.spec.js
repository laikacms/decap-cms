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
import { Router, Switch } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { render } from '@testing-library/react';

import { isSearchDisabled, RouteInCollection } from '../App';

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

function t(key) {
  return (
    {
      'app.notFoundPage.header': 'Not Found',
      'app.notFoundPage.backToHome': 'Back to home',
    }[key] || key
  );
}

// Regression test for DCMS-489: deep-linking to a route in a collection that
// doesn't exist used to silently <Redirect> to the first collection, rewriting
// the URL bar so the NotFoundPage fallback route was never reached. It must
// instead render NotFoundPage in place, leaving the URL untouched.
describe('RouteInCollection', () => {
  const collections = fromJS({
    posts: { name: 'posts' },
  });

  it('renders NotFoundPage without redirecting when the collection does not exist', () => {
    const history = createMemoryHistory({ initialEntries: ['/collections/BOGUS-xyz'] });
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

    expect(getByText('Not Found')).toBeInTheDocument();
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
