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

describe('navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('navigateToCollection', () => {
    it('should push the collection route', async () => {
      const { navigateToCollection } = await import('../navigation');

      navigateToCollection('posts');
      expect(history.push).toHaveBeenCalledTimes(1);
      expect(history.push).toHaveBeenCalledWith('/collections/posts');
    });
  });

  describe('navigateToNewEntry', () => {
    it('should replace with the new entry route', async () => {
      const { navigateToNewEntry } = await import('../navigation');

      navigateToNewEntry('posts');
      expect(history.replace).toHaveBeenCalledTimes(1);
      expect(history.replace).toHaveBeenCalledWith('/collections/posts/new');
    });
  });

  describe('navigateToEntry', () => {
    it('should replace with the entry route', async () => {
      const { navigateToEntry } = await import('../navigation');

      navigateToEntry('posts', 'index');
      expect(history.replace).toHaveBeenCalledTimes(1);
      expect(history.replace).toHaveBeenCalledWith('/collections/posts/entries/index');
    });
  });
});
