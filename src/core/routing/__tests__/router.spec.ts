vi.mock('history');

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHashHistory } from 'history';

import type { History } from 'history';

const history = {
  push: vi.fn(),
  replace: vi.fn(),
  listen: vi.fn(),
  block: vi.fn(),
  location: { pathname: '/', search: '' },
} as unknown as History;
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

    it('round-trips search.searchTerm through create/get, encoding a literal "/"', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      for (const searchTerm of trickyValues) {
        const path = defaultRoutingTable.search.create({ searchTerm });
        // A literal "/" in the query must not appear unescaped in the path,
        // otherwise it would split into an extra path segment.
        expect(path.slice('/search/'.length)).not.toContain('/');
        const { searchTerm: parsed } = defaultRoutingTable.search.get(path);
        expect(parsed).toBe(searchTerm);
      }
    });

    it('encodes a space as %20 and decodes it back to a literal space', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      const path = defaultRoutingTable.search.create({ searchTerm: 'hello world' });
      expect(path).toBe('/search/hello%20world');
      expect(defaultRoutingTable.search.get(path)).toEqual({ searchTerm: 'hello world' });
    });

    it('encodes a "/" in the query as %2F so it still matches the search route', async () => {
      const { defaultRoutingTable, matchRoute } = await import('@/core/routing/router');

      const path = defaultRoutingTable.search.create({ searchTerm: 'foo/bar' });
      expect(path).toBe('/search/foo%2Fbar');
      expect(defaultRoutingTable.search.get(path)).toEqual({ searchTerm: 'foo/bar' });

      const match = matchRoute(defaultRoutingTable, path);
      expect(match).toEqual({ key: 'search', params: { searchTerm: 'foo/bar' } });
    });

    it('round-trips unicode and emoji query text', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      const path = defaultRoutingTable.search.create({ searchTerm: 'café 😀' });
      expect(defaultRoutingTable.search.get(path)).toEqual({ searchTerm: 'café 😀' });
    });

    it('decodes an already-encoded path (e.g. a deep link) back to the human-readable value', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      expect(defaultRoutingTable.search.get('/search/caf%C3%A9')).toEqual({
        searchTerm: 'café',
      });
    });

    it('raises the route-specific "Invalid ... path" error (not a raw URIError) on a malformed escape', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      expect(() => defaultRoutingTable.search.get('/search/%ZZ')).toThrow(
        'Invalid search path: /search/%ZZ',
      );
      expect(() => defaultRoutingTable.search.get('/search/%ZZ')).not.toThrow(URIError);
    });

    it('round-trips collection.collectionName', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      for (const collectionName of trickyValues.filter(v => !v.includes('/'))) {
        const path = defaultRoutingTable.collection.create({ collectionName });
        expect(defaultRoutingTable.collection.get(path)).toEqual({ collectionName });
      }
    });

    it('round-trips entryNew.collectionName', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      const path = defaultRoutingTable.entryNew.create({ collectionName: 'café-posts' });
      expect(defaultRoutingTable.entryNew.get(path)).toEqual({ collectionName: 'café-posts' });
    });

    it('round-trips entry.{collectionName,slug}', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      const path = defaultRoutingTable.entry.create({
        collectionName: 'posts',
        slug: 'café-story 😀',
      });
      expect(defaultRoutingTable.entry.get(path)).toEqual({
        collectionName: 'posts',
        slug: 'café-story 😀',
      });
    });

    it('round-trips collectionSearch.{collectionName,searchTerm}, encoding a literal "/"', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

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

    it('round-trips collectionFilter.{collectionName,filterTerm}', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      const path = defaultRoutingTable.collectionFilter.create({
        collectionName: 'posts',
        filterTerm: 'status: published',
      });
      expect(defaultRoutingTable.collectionFilter.get(path)).toEqual({
        collectionName: 'posts',
        filterTerm: 'status: published',
      });
    });

    it('round-trips editRedirect.{collectionName,slug}', async () => {
      const { defaultRoutingTable } = await import('@/core/routing/router');

      const path = defaultRoutingTable.editRedirect.create({
        collectionName: 'posts',
        slug: 'café-story',
      });
      expect(defaultRoutingTable.editRedirect.get(path)).toEqual({
        collectionName: 'posts',
        slug: 'café-story',
      });
    });
  });

  describe('matchRoute', () => {
    it('returns null (not a thrown error) for an unmatched path', async () => {
      const { defaultRoutingTable, matchRoute } = await import('@/core/routing/router');

      expect(matchRoute(defaultRoutingTable, '/does/not/exist')).toBeNull();
    });

    it('lands a malformed-escape deep link on no match rather than throwing', async () => {
      const { defaultRoutingTable, matchRoute } = await import('@/core/routing/router');

      expect(matchRoute(defaultRoutingTable, '/search/%ZZ')).toBeNull();
    });
  });

  describe('defaultRouter', () => {
    it('navigate() encodes the search term when pushing', async () => {
      const { defaultRouter } = await import('@/core/routing/router');

      defaultRouter.navigate('search', { searchTerm: 'hello world' });
      expect(history.push).toHaveBeenCalledWith('/search/hello%20world');
    });

    it('params() decodes the search term parsed from the current location', async () => {
      history.location = { pathname: '/search/hello%20world', search: '' } as History['location'];
      const { defaultRouter } = await import('@/core/routing/router');

      expect(defaultRouter.params('search')).toEqual({ searchTerm: 'hello world' });
    });
  });
});
