import { getChangeItem, AzureCommitChangeType, AzureItemContentType } from '../API';

describe('Azure API', () => {
  describe('getChangeItem', () => {
    test('ADD: returns changeType ADD with item.path and base64 newContent', () => {
      const item = {
        action: AzureCommitChangeType.ADD,
        path: '/content/posts/hello.md',
        base64Content: 'aGVsbG8=',
      };
      const result = getChangeItem(item);
      expect(result).toEqual({
        changeType: AzureCommitChangeType.ADD,
        item: { path: '/content/posts/hello.md' },
        newContent: {
          content: 'aGVsbG8=',
          contentType: AzureItemContentType.BASE64,
        },
      });
    });

    test('EDIT: returns changeType EDIT with item.path and base64 newContent', () => {
      const item = {
        action: AzureCommitChangeType.EDIT,
        path: '/content/posts/hello.md',
        base64Content: 'd29ybGQ=',
      };
      const result = getChangeItem(item);
      expect(result).toEqual({
        changeType: AzureCommitChangeType.EDIT,
        item: { path: '/content/posts/hello.md' },
        newContent: {
          content: 'd29ybGQ=',
          contentType: AzureItemContentType.BASE64,
        },
      });
    });

    test('DELETE: returns changeType DELETE with item.path and no newContent', () => {
      const item = {
        action: AzureCommitChangeType.DELETE,
        path: '/content/posts/hello.md',
      };
      const result = getChangeItem(item);
      expect(result).toEqual({
        changeType: AzureCommitChangeType.DELETE,
        item: { path: '/content/posts/hello.md' },
      });
      expect(result.newContent).toBeUndefined();
    });

    test('RENAME: returns changeType RENAME with item.path and sourceServerItem from oldPath', () => {
      const item = {
        action: AzureCommitChangeType.RENAME,
        path: '/content/posts/new-name.md',
        oldPath: '/content/posts/old-name.md',
      };
      const result = getChangeItem(item);
      expect(result).toEqual({
        changeType: AzureCommitChangeType.RENAME,
        item: { path: '/content/posts/new-name.md' },
        sourceServerItem: '/content/posts/old-name.md',
      });
    });

    test('default: returns empty object for unknown action', () => {
      const item = {
        action: 'unknown',
        path: '/content/posts/hello.md',
      };
      const result = getChangeItem(item);
      expect(result).toEqual({});
    });
  });
});
