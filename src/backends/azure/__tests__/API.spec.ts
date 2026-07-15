import { describe, expect, it, vi } from 'vitest';

import { AzureCommitChangeType, delay, getChangeItem } from '@/backends/azure/API';

describe('azure API', () => {
  describe('getChangeItem', () => {
    it('maps an ADD action to an add change payload', () => {
      const result = getChangeItem({
        action: AzureCommitChangeType.ADD,
        path: '/content/posts/new-post.md',
        base64Content: 'c29tZSBjb250ZW50',
      });

      expect(result).toEqual({
        changeType: AzureCommitChangeType.ADD,
        item: { path: '/content/posts/new-post.md' },
        newContent: {
          content: 'c29tZSBjb250ZW50',
          contentType: 'base64encoded',
        },
      });
    });

    it('maps an EDIT action to an edit change payload', () => {
      const result = getChangeItem({
        action: AzureCommitChangeType.EDIT,
        path: '/content/posts/existing-post.md',
        base64Content: 'dXBkYXRlZCBjb250ZW50',
      });

      expect(result).toEqual({
        changeType: AzureCommitChangeType.EDIT,
        item: { path: '/content/posts/existing-post.md' },
        newContent: {
          content: 'dXBkYXRlZCBjb250ZW50',
          contentType: 'base64encoded',
        },
      });
    });

    it('maps a DELETE action to a delete change payload without content', () => {
      const result = getChangeItem({
        action: AzureCommitChangeType.DELETE,
        path: '/content/posts/removed-post.md',
      });

      expect(result).toEqual({
        changeType: AzureCommitChangeType.DELETE,
        item: { path: '/content/posts/removed-post.md' },
      });
    });

    it('maps a RENAME action to a rename change payload with the source path', () => {
      const result = getChangeItem({
        action: AzureCommitChangeType.RENAME,
        path: '/content/posts/renamed-post.md',
        oldPath: '/content/posts/old-post.md',
      });

      expect(result).toEqual({
        changeType: AzureCommitChangeType.RENAME,
        item: { path: '/content/posts/renamed-post.md' },
        sourceServerItem: '/content/posts/old-post.md',
      });
    });

    it('returns an empty object for an unmatched action', () => {
      const result = getChangeItem({
        action: 'unknown' as AzureCommitChangeType,
        path: '/content/posts/unknown-post.md',
      });

      expect(result).toEqual({});
    });
  });

  describe('delay', () => {
    it('resolves after the given number of milliseconds', async () => {
      vi.useFakeTimers();
      try {
        const onResolved = vi.fn();
        delay(1000).then(onResolved);

        expect(onResolved).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(999);
        expect(onResolved).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(onResolved).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
