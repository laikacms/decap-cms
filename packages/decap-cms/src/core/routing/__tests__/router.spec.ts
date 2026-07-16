vi.mock('@/lib/routing/hashHistory');

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultRouter } from '@/core/routing/defaultRouter';
import { defaultRoutingTable, matchRoute } from '@/core/routing/router';
import { createHashHistory } from '@/lib/routing/hashHistory';

import type { HashHistory, HistoryBlocker, HistoryListener } from '@/lib/routing/hashHistory';

const history = {
  push: vi.fn(),
  replace: vi.fn(),
  listen: vi.fn(),
  block: vi.fn(),
  createHref: vi.fn((to: string) => `#${to}`),
  location: { pathname: '/', search: '', hash: '', state: null, key: 'default' },
} as unknown as HashHistory;
vi.mocked(createHashHistory).mockReturnValue(history);

describe('router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('defaultRoutingTable', () => {
    // Values that must survive an encode/decode round trip: spaces, slashes,
    // hashes, question marks, and unicode/emoji (DCMS-444).
    const trickyValues = [
      'hello world',
      'foo/bar',
      'café-story',
      '😀 party',
      'a#b?c&d',
      '100%-done',
    ];

    it('round-trips search.searchTerm through create/get, encoding a literal "/"', () => {
      for (const searchTerm of trickyValues) {
        const path = defaultRoutingTable.search.create({ searchTerm });
        // A literal "/" in the query must not appear unescaped in the path,
        // otherwise it would split into an extra path segment.
        expect(path.slice('/search/'.length)).not.toContain('/');
        const { searchTerm: parsed } = defaultRoutingTable.search.get(path);
        expect(parsed).toBe(searchTerm);
      }
    });

    it('encodes a space as %20 and decodes it back to a literal space', () => {
      const path = defaultRoutingTable.search.create({ searchTerm: 'hello world' });
      expect(path).toBe('/search/hello%20world');
      expect(defaultRoutingTable.search.get(path)).toEqual({ searchTerm: 'hello world' });
    });

    it('encodes a "/" in the query as %2F so it still matches the search route', () => {
      const path = defaultRoutingTable.search.create({ searchTerm: 'foo/bar' });
      expect(path).toBe('/search/foo%2Fbar');
      expect(defaultRoutingTable.search.get(path)).toEqual({ searchTerm: 'foo/bar' });

      const match = matchRoute(defaultRoutingTable, path);
      expect(match).toEqual({ key: 'search', params: { searchTerm: 'foo/bar' } });
    });

    it('round-trips unicode and emoji query text', () => {
      const path = defaultRoutingTable.search.create({ searchTerm: 'café 😀' });
      expect(defaultRoutingTable.search.get(path)).toEqual({ searchTerm: 'café 😀' });
    });

    it('decodes an already-encoded path (e.g. a deep link) back to the human-readable value', () => {
      expect(defaultRoutingTable.search.get('/search/caf%C3%A9')).toEqual({
        searchTerm: 'café',
      });
    });

    it('raises the route-specific "Invalid ... path" error (not a raw URIError) on a malformed escape', () => {
      expect(() => defaultRoutingTable.search.get('/search/%ZZ')).toThrow(
        'Invalid search path: /search/%ZZ',
      );
      expect(() => defaultRoutingTable.search.get('/search/%ZZ')).not.toThrow(URIError);
    });

    it('round-trips collection.collectionName', () => {
      for (const collectionName of trickyValues.filter(v => !v.includes('/'))) {
        const path = defaultRoutingTable.collection.create({ collectionName });
        expect(defaultRoutingTable.collection.get(path)).toEqual({ collectionName });
      }
    });

    it('round-trips entryNew.collectionName', () => {
      const path = defaultRoutingTable.entryNew.create({ collectionName: 'café-posts' });
      expect(defaultRoutingTable.entryNew.get(path)).toEqual({ collectionName: 'café-posts' });
    });

    it('round-trips entry.{collectionName,slug}', () => {
      const path = defaultRoutingTable.entry.create({
        collectionName: 'posts',
        slug: 'café-story 😀',
      });
      expect(defaultRoutingTable.entry.get(path)).toEqual({
        collectionName: 'posts',
        slug: 'café-story 😀',
      });
    });

    it('round-trips collectionSearch.{collectionName,searchTerm}, encoding a literal "/"', () => {
      const path = defaultRoutingTable.collectionSearch.create({
        collectionName: 'posts',
        searchTerm: 'foo/bar baz',
      });
      expect(path).not.toMatch(/posts\/search\/[^?]*\/[^?]*\//);
      expect(defaultRoutingTable.collectionSearch.get(path)).toEqual({
        collectionName: 'posts',
        searchTerm: 'foo/bar baz',
      });
    });

    it('round-trips collectionFilter.{collectionName,filterTerm}', () => {
      const path = defaultRoutingTable.collectionFilter.create({
        collectionName: 'posts',
        filterTerm: 'status: published',
      });
      expect(defaultRoutingTable.collectionFilter.get(path)).toEqual({
        collectionName: 'posts',
        filterTerm: 'status: published',
      });
    });

    it('round-trips editRedirect.{collectionName,slug}', () => {
      const path = defaultRoutingTable.editRedirect.create({
        collectionName: 'posts',
        slug: 'café-story',
      });
      expect(defaultRoutingTable.editRedirect.get(path)).toEqual({
        collectionName: 'posts',
        slug: 'café-story',
      });
    });

    it('round-trips the media route (DCMS-578)', () => {
      const path = defaultRoutingTable.media.create();
      expect(path).toBe('/media');
      expect(defaultRoutingTable.media.get(path)).toEqual({});

      const match = matchRoute(defaultRoutingTable, path);
      expect(match).toEqual({ key: 'media', params: {} });
    });
  });

  describe('matchRoute', () => {
    it('returns null (not a thrown error) for an unmatched path', () => {
      expect(matchRoute(defaultRoutingTable, '/does/not/exist')).toBeNull();
    });

    it('lands a malformed-escape deep link on no match rather than throwing', () => {
      expect(matchRoute(defaultRoutingTable, '/search/%ZZ')).toBeNull();
    });
  });

  describe('createDefaultRouter', () => {
    it('creates one hash history per call and adapts push/replace/href to it', () => {
      const router = createDefaultRouter();
      expect(createHashHistory).toHaveBeenCalledTimes(1);

      router.push('/search/hello%20world');
      expect(history.push).toHaveBeenCalledWith('/search/hello%20world');

      router.replace('/workflow');
      expect(history.replace).toHaveBeenCalledWith('/workflow');

      expect(router.href('/media')).toBe('#/media');
      expect(history.createHref).toHaveBeenCalledWith('/media');
    });

    it('narrows location() to pathname + search', () => {
      const router = createDefaultRouter();
      expect(router.location()).toEqual({ pathname: '/', search: '' });
    });

    it('narrows subscribe payloads to { pathname, search } + action', () => {
      const router = createDefaultRouter();
      const seen: unknown[] = [];
      router.subscribe(update => seen.push(update));

      const historyListener = vi.mocked(history.listen).mock.calls[0][0] as HistoryListener;
      historyListener({
        action: 'PUSH',
        location: { pathname: '/workflow', search: '?a=1', hash: '', state: null, key: 'k1' },
      });

      expect(seen).toEqual([
        { action: 'PUSH', location: { pathname: '/workflow', search: '?a=1' } },
      ]);
    });

    it('narrows block transitions and passes retry through', () => {
      const router = createDefaultRouter();
      const retry = vi.fn();
      const seen: { retry: () => void }[] = [];
      router.block(tx => seen.push(tx));

      const historyBlocker = vi.mocked(history.block).mock.calls[0][0] as HistoryBlocker;
      historyBlocker({
        action: 'POP',
        location: { pathname: '/', search: '', hash: '', state: null, key: 'k2' },
        retry,
      });

      expect(seen).toEqual([
        { action: 'POP', location: { pathname: '/', search: '' }, retry },
      ]);
      seen[0].retry();
      expect(retry).toHaveBeenCalledTimes(1);
    });
  });
});
