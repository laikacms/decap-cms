import { afterEach, describe, expect, it } from 'vitest';

import { defaultRoutingTable, matchRoute } from '@/core/routing/router';
import { createHashHistory } from '@/lib/routing/hashHistory';

/**
 * DCMS-1792 regression guard, at the seam the bug actually lived in: the
 * *transport* between `create` and `get`.
 *
 * `router.spec.ts` already round-trips tricky query text through
 * `defaultRoutingTable.search.create/get` directly, but those two are
 * trivially inverse in isolation. The historical bugs were never in that
 * pair — they were in what the URL layer did to the path in between. Under
 * the old `history` v4 + React Router 5 stack, `createLocation` ran
 * `decodeURI` on every pushed pathname, which decodes every percent-escape
 * *except* those for URI-reserved characters (`; / ? : @ & = + $ , #`).
 * Nothing decoded a second time, so `#` and `?` in a search query reached
 * the app as literal `%23` / `%3F` text.
 *
 * The in-house hash history performs no such decode pass, so the class of
 * bug is gone by construction. This test pins that: it pushes through a
 * real `createHashHistory` bound to the real jsdom window and reads the
 * query back out through `matchRoute`, so any future URL-layer change that
 * reintroduces an encode/decode pass fails here.
 */

// Spaces, a literal `/`, the URI-reserved characters that the old stack
// mangled, a bare `%` (which naive `decodeURIComponent` on the whole path
// would throw on), and unicode/emoji.
const queries = [
  'hello world',
  'foo/bar',
  'post # 5',
  'a?b',
  '50% off',
  '100%off',
  'a;b/c?d:e@f&g=h+i$j,k#l',
  'utf8: café',
  '😀 party',
];

function withHistory<T>(run: (history: ReturnType<typeof createHashHistory>) => T): T {
  const history = createHashHistory({ window: document.defaultView! });
  return run(history);
}

describe('search term transport through the real hash history (DCMS-1792)', () => {
  afterEach(() => {
    document.defaultView!.location.hash = '';
  });

  it.each(queries)('round-trips %j pushed as a global search path', query => {
    withHistory(history => {
      history.push(defaultRoutingTable.search.create({ searchTerm: query }));

      const match = matchRoute(defaultRoutingTable, history.location.pathname);

      expect(match).toEqual({ key: 'search', params: { searchTerm: query } });
    });
  });

  it.each(queries)('round-trips %j pushed as a collection search path', query => {
    withHistory(history => {
      history.push(
        defaultRoutingTable.collectionSearch.create({ collectionName: 'posts', searchTerm: query }),
      );

      const match = matchRoute(defaultRoutingTable, history.location.pathname);

      expect(match).toEqual({
        key: 'collectionSearch',
        params: { collectionName: 'posts', searchTerm: query },
      });
    });
  });

  it('keeps a query containing "/" inside a single path segment', () => {
    withHistory(history => {
      history.push(defaultRoutingTable.search.create({ searchTerm: 'foo/bar' }));

      // If the "/" leaked through unescaped the pathname would carry an extra
      // segment and the anchored search route would stop matching.
      expect(history.location.pathname).toBe('/search/foo%2Fbar');
    });
  });

  it('keeps a query containing "#" from truncating the hash', () => {
    withHistory(history => {
      history.push(defaultRoutingTable.search.create({ searchTerm: 'post # 5' }));

      // A raw "#" here would end the hash and drop everything after it.
      expect(history.location.pathname).toBe('/search/post%20%23%205');
    });
  });
});
