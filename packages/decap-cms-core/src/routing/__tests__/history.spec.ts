vi.mock('history');

import { createHashHistory } from 'history';

import type { History } from 'history';

const history = { push: vi.fn(), replace: vi.fn() } as unknown as History;
vi.mocked(createHashHistory).mockReturnValue(history);

describe('history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('navigateToCollection', () => {
    it('should push route', async () => {
      const { navigateToCollection } = await import('../history');

      navigateToCollection('posts');
      expect(history.push).toHaveBeenCalledTimes(1);
      expect(history.push).toHaveBeenCalledWith('/collections/posts');
    });
  });

  describe('navigateToNewEntry', () => {
    it('should replace route', async () => {
      const { navigateToNewEntry } = await import('../history');

      navigateToNewEntry('posts');
      expect(history.replace).toHaveBeenCalledTimes(1);
      expect(history.replace).toHaveBeenCalledWith('/collections/posts/new');
    });
  });

  describe('navigateToEntry', () => {
    it('should replace route', async () => {
      const { navigateToEntry } = await import('../history');

      navigateToEntry('posts', 'index');
      expect(history.replace).toHaveBeenCalledTimes(1);
      expect(history.replace).toHaveBeenCalledWith('/collections/posts/entries/index');
    });
  });
});
