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
