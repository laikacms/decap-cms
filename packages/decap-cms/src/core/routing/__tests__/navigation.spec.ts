import { beforeEach, describe, expect, it, vi } from 'vitest';

import { navigateToCollection, navigateToEntry, navigateToNewEntry } from '@/core/routing/navigation';
import { setActiveRouting } from '@/core/routing/registry';
import { defaultRoutingTable } from '@/core/routing/router';

import type { Router } from '@/core/routing/router';

const router: Router = {
  location: () => ({ pathname: '/', search: '' }),
  push: vi.fn(),
  replace: vi.fn(),
  href: (path: string) => `#${path}`,
  subscribe: vi.fn(() => () => {}),
  block: vi.fn(() => () => {}),
};

describe('navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActiveRouting({ router, routing: defaultRoutingTable });
  });

  describe('navigateToCollection', () => {
    it('should push the collection route', () => {
      navigateToCollection('posts');
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith('/collections/posts');
    });
  });

  describe('navigateToNewEntry', () => {
    it('should replace with the new entry route', () => {
      navigateToNewEntry('posts');
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/collections/posts/new');
    });
  });

  describe('navigateToEntry', () => {
    it('should replace with the entry route', () => {
      navigateToEntry('posts', 'index');
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/collections/posts/entries/index');
    });
  });
});
