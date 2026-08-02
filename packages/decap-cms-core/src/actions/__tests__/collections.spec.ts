import { history } from '../../routing/history';
import { searchCollections, showCollection, createNewEntry } from '../collections';

jest.mock('../../routing/history', () => ({
  history: { push: jest.fn() },
}));

jest.mock('../../lib/urlHelper', () => ({
  getCollectionUrl: (name: string) => `/collections/${name}`,
  getNewEntryUrl: (name: string) => `/collections/${name}/new`,
}));

const mockPush = history.push as jest.Mock;

beforeEach(() => {
  mockPush.mockClear();
});

describe('collections navigation action creators', () => {
  describe('searchCollections(query, collection)', () => {
    it('navigates to collection-scoped search when collection is provided', () => {
      searchCollections('hello', 'posts');
      expect(mockPush).toHaveBeenCalledWith('/collections/posts/search/hello');
    });

    it('navigates to global search when collection is empty', () => {
      searchCollections('world', '');
      expect(mockPush).toHaveBeenCalledWith('/search/world');
    });

    it('percent-encodes special characters in the query (DCMS-1788)', () => {
      searchCollections('post # 5', 'posts');
      expect(mockPush).toHaveBeenCalledWith('/collections/posts/search/post%20%23%205');
    });

    it('percent-encodes query characters that collide with URL syntax (DCMS-1788)', () => {
      searchCollections('a?b&c=1', 'posts');
      expect(mockPush).toHaveBeenCalledWith('/collections/posts/search/a%3Fb%26c%3D1');
    });
  });

  describe('showCollection(collectionName)', () => {
    it('navigates to the collection URL', () => {
      showCollection('articles');
      expect(mockPush).toHaveBeenCalledWith('/collections/articles');
    });
  });

  describe('createNewEntry(collectionName)', () => {
    it('navigates to the new entry URL', () => {
      createNewEntry('pages');
      expect(mockPush).toHaveBeenCalledWith('/collections/pages/new');
    });
  });
});
