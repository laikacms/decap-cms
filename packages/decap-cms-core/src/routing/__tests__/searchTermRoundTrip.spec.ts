// DCMS-1792: `searchCollections` percent-encodes the search query
// (DCMS-1788) before calling `history.push`, but history v4's
// `createLocation` runs `decodeURI` on the resulting pathname, which
// decodes every escape except the ones for URI-reserved characters
// (`; / ? : @ & = + $ , #`). React Router 5's `matchPath` (used by this
// app, see `App.js`) then reads the matched `:searchTerm` segment as-is,
// with no second decode pass. So a query containing `#`/`?`/etc. arrives
// at the app with those characters still escaped as literal `%23`/`%3F`
// text, and a query containing a literal `%` can make the intermediate
// pathname briefly contain an invalid escape sequence.
//
// This test exercises the REAL (non-mocked) `history` package together
// with the REAL `matchPath` from `react-router`, mirroring what actually
// happens between `searchCollections`'s `history.push` call and the
// `:searchTerm` route param the app reads in `Collection.js`.
import { matchPath } from 'react-router';

import { searchCollections } from '../../actions/collections';
import { decodeSearchTerm } from '../../lib/urlHelper';

import type { createMemoryHistory } from 'history';

jest.mock('../history', () => {
  const { createMemoryHistory: createRealMemoryHistory } = jest.requireActual('history');
  return { history: createRealMemoryHistory() };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { history: mockHistory } = require('../history');

describe('search query round-trip through the real hash-history router (DCMS-1792)', () => {
  it.each([
    ['50% off', 'search results header should show 50% off with no pageerror'],
    ['100%off', 'no URIError, header should show the literal typed string'],
    ['post # 5', 'header should show post # 5 (parity with v4.beta)'],
    ['utf8: café', 'unicode + reserved char should round-trip'],
  ])('pushes %j through history + matchPath and decodes back to the original', query => {
    expect(() => searchCollections(query, 'posts')).not.toThrow();

    const location = (mockHistory as ReturnType<typeof createMemoryHistory>).location;
    const match = matchPath<{ name: string; searchTerm: string }>(location.pathname, {
      path: '/collections/:name/search/:searchTerm',
      exact: true,
    });

    expect(match).not.toBeNull();
    expect(decodeSearchTerm(match!.params.searchTerm)).toBe(query);
  });

  it('round-trips a query containing #, %, ?, and space together', () => {
    const query = 'a query with # % ? and spaces';
    searchCollections(query, 'posts');

    const location = (mockHistory as ReturnType<typeof createMemoryHistory>).location;
    const match = matchPath<{ name: string; searchTerm: string }>(location.pathname, {
      path: '/collections/:name/search/:searchTerm',
      exact: true,
    });

    expect(match).not.toBeNull();
    expect(decodeSearchTerm(match!.params.searchTerm)).toBe(query);
  });
});
