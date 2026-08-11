import { afterEach, describe, expect, it, vi } from 'vitest';

import { FOLDER } from '@/core/constants/collectionTypes';
import Algolia from '@/core/integrations/providers/algolia/implementation';

import type { CmsCollectionState } from '@/lib/util/index';

const collection = {
  name: 'posts',
  type: FOLDER,
  folder: 'content/posts',
  extension: 'md',
  fields: [],
} as unknown as CmsCollectionState;

function algoliaResponse(body: unknown) {
  return {
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function stubFetch(body: unknown) {
  const fetchMock = vi.fn(() => Promise.resolve(algoliaResponse(body)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function hits(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    path: `content/posts/post-${i}.md`,
    slug: `post-${i}`,
    data: { title: `Post ${i}` },
  }));
}

describe('Algolia integration pagination', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers a next action while more pages remain', async () => {
    stubFetch({ hits: hits(2), page: 0, nbPages: 3 });
    const algolia = new Algolia({ applicationID: 'app', apiKey: 'key' });

    const { cursor } = await algolia.listEntries(collection, 0);

    expect(cursor.actions).toEqual(new Set(['next']));
    expect(cursor.meta).toEqual({ page: 0, pageCount: 3 });
  });

  it('offers no actions on the last page', async () => {
    stubFetch({ hits: hits(2), page: 2, nbPages: 3 });
    const algolia = new Algolia({ applicationID: 'app', apiKey: 'key' });

    const { cursor } = await algolia.listEntries(collection, 2);

    expect(cursor.actions).toEqual(new Set());
  });

  it('stops at the first empty page when the response omits nbPages', async () => {
    stubFetch({ hits: [], page: 1 });
    const algolia = new Algolia({ applicationID: 'app', apiKey: 'key' });

    const { cursor } = await algolia.listEntries(collection, 1);

    expect(cursor.actions).toEqual(new Set());
    expect(cursor.meta).toEqual({ page: 1 });
  });

  it('replays the cached cursor for a repeated page request', async () => {
    const fetchMock = stubFetch({ hits: hits(2), page: 0, nbPages: 3 });
    const algolia = new Algolia({ applicationID: 'app', apiKey: 'key' });

    const first = await algolia.listEntries(collection, 0);
    const second = await algolia.listEntries(collection, 0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.cursor).toBe(first.cursor);
  });
});
