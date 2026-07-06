import { fromJS } from 'immutable';
import { unsentRequest } from 'decap-cms-lib-util';

import Algolia from '../implementation';

jest.mock('decap-cms-lib-util', () => ({
  unsentRequest: {
    fetchWithTimeout: jest.fn(),
  },
}));

function createAlgolia(config = {}) {
  return new Algolia(
    fromJS({
      applicationID: 'app-id',
      apiKey: 'api-key',
      ...config,
    }),
  );
}

describe('Algolia integration', () => {
  beforeEach(() => {
    unsentRequest.fetchWithTimeout.mockReset();
  });

  describe('getSlug (via search)', () => {
    // getSlug is a private, module-scoped helper (not exported), so it is
    // exercised indirectly through `search`, which maps each hit's `path`
    // through it to derive the resulting entry's `slug`.
    function mockSearchResponse(hits) {
      unsentRequest.fetchWithTimeout.mockResolvedValue({
        headers: { get: () => 'application/json' },
        ok: true,
        json: () => Promise.resolve({ results: [{ hits }] }),
      });
    }

    it('strips directory and extension for a nested path', async () => {
      mockSearchResponse([{ path: 'posts/2020/my-nested-post.md', data: {} }]);

      const algolia = createAlgolia();
      const { entries } = await algolia.search(['posts'], 'query', 1);

      expect(entries[0].slug).toEqual('my-nested-post');
    });

    it('returns the whole filename when there is no extension', async () => {
      mockSearchResponse([{ path: 'posts/no-extension-post', data: {} }]);

      const algolia = createAlgolia();
      const { entries } = await algolia.search(['posts'], 'query', 1);

      expect(entries[0].slug).toEqual('no-extension-post');
    });
  });

  describe('requestHeaders', () => {
    it('returns the default Algolia auth headers', () => {
      const algolia = createAlgolia();

      expect(algolia.requestHeaders()).toEqual({
        'X-Algolia-API-Key': 'api-key',
        'X-Algolia-Application-Id': 'app-id',
        'Content-Type': 'application/json',
      });
    });

    it('merges and overrides headers passed in', () => {
      const algolia = createAlgolia();

      expect(
        algolia.requestHeaders({
          'Content-Type': 'text/plain',
          'X-Custom-Header': 'custom-value',
        }),
      ).toEqual({
        'X-Algolia-API-Key': 'api-key',
        'X-Algolia-Application-Id': 'app-id',
        'Content-Type': 'text/plain',
        'X-Custom-Header': 'custom-value',
      });
    });
  });

  describe('urlFor', () => {
    it('returns the path unchanged when there are no params', () => {
      const algolia = createAlgolia();

      expect(algolia.urlFor('/indexes/posts', {})).toEqual('/indexes/posts');
    });

    it('appends a single param as a query string', () => {
      const algolia = createAlgolia();

      expect(algolia.urlFor('/indexes/posts', { params: { page: 1 } })).toEqual(
        '/indexes/posts?page=1',
      );
    });

    it('appends multiple params joined by & and URL-encodes values', () => {
      const algolia = createAlgolia();

      expect(
        algolia.urlFor('/indexes/posts', {
          params: { query: 'a query with spaces', page: 2 },
        }),
      ).toEqual('/indexes/posts?query=a%20query%20with%20spaces&page=2');
    });
  });

  describe('parseJsonResponse', () => {
    it('resolves with the parsed JSON body when the response is ok', async () => {
      const algolia = createAlgolia();
      const response = {
        ok: true,
        json: () => Promise.resolve({ hits: [] }),
      };

      await expect(algolia.parseJsonResponse(response)).resolves.toEqual({ hits: [] });
    });

    it('rejects with the parsed JSON body when the response is not ok', async () => {
      const algolia = createAlgolia();
      const response = {
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      };

      await expect(algolia.parseJsonResponse(response)).rejects.toEqual({
        message: 'Invalid API key',
      });
    });
  });
});
