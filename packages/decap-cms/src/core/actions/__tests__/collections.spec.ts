import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNewEntry, searchCollections, showCollection } from '@/core/actions/collections';
import { getActiveRouting } from '@/core/routing/registry';

vi.mock('@/core/routing/registry');

describe('collections actions', () => {
  const push = vi.fn();
  const collectionSearchCreate = vi.fn().mockReturnValue('/collections/posts/search/foo');
  const searchCreate = vi.fn().mockReturnValue('/search/foo');
  const collectionCreate = vi.fn().mockReturnValue('/collections/posts');
  const entryNewCreate = vi.fn().mockReturnValue('/collections/posts/new');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveRouting).mockReturnValue({
      router: { push } as any,
      routing: {
        collectionSearch: { create: collectionSearchCreate, get: vi.fn() },
        search: { create: searchCreate, get: vi.fn() },
        collection: { create: collectionCreate, get: vi.fn() },
        entryNew: { create: entryNewCreate, get: vi.fn() },
      } as any,
    });
  });

  describe('searchCollections', () => {
    it('routes through routing.collectionSearch.create when a collection is given', () => {
      searchCollections('foo', 'posts');

      expect(collectionSearchCreate).toHaveBeenCalledWith({
        collectionName: 'posts',
        searchTerm: 'foo',
      });
      expect(searchCreate).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/collections/posts/search/foo');
    });

    it('routes through routing.search.create when no collection is given', () => {
      searchCollections('foo', '');

      expect(searchCreate).toHaveBeenCalledWith({ searchTerm: 'foo' });
      expect(collectionSearchCreate).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/search/foo');
    });
  });

  describe('showCollection', () => {
    it('routes through routing.collection.create and pushes the resulting path', () => {
      showCollection('posts');

      expect(collectionCreate).toHaveBeenCalledWith({ collectionName: 'posts' });
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/collections/posts');
    });
  });

  describe('createNewEntry', () => {
    it('routes through routing.entryNew.create and pushes the resulting path', () => {
      createNewEntry('posts');

      expect(entryNewCreate).toHaveBeenCalledWith({ collectionName: 'posts' });
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/collections/posts/new');
    });
  });
});
