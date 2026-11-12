import { describe, expect, it, vi } from 'vitest';

import API, { AzureCommitChangeType, delay, getChangeItem } from '@/backends/azure/API';

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

describe('azure API user', () => {
  function createApi() {
    return new API(
      {
        apiRoot: 'https://dev.azure.com',
        apiVersion: '6.1-preview',
        repo: { org: 'org', project: 'project', repoName: 'repo' },
        branch: 'main',
        squashMerges: false,
        initialWorkflowStatus: 'draft',
        cmsLabelPrefix: 'decap-cms/',
      },
      'token',
    );
  }

  it('should use the email address as the login', async () => {
    const api = createApi();
    const requestJSON = vi.fn().mockResolvedValue({
      coreAttributes: {
        DisplayName: { value: 'Jane Doe' },
        EmailAddress: { value: 'jane@example.com' },
        Avatar: { value: { value: 'avatar' } },
      },
    });
    (api as any).requestJSON = requestJSON;

    await expect(api.user()).resolves.toEqual({
      name: 'Jane Doe',
      login: 'jane@example.com',
      email: 'jane@example.com',
      avatar_url: 'data:image/png;base64,avatar',
    });
    expect(requestJSON).toHaveBeenCalledWith({
      url: 'https://app.vssps.visualstudio.com/_apis/profile/profiles/me',
      params: { 'api-version': '6.1-preview.2' },
    });
  });

  it('should read top-level profile fields when coreAttributes is missing', async () => {
    const api = createApi();
    (api as any).requestJSON = vi.fn().mockResolvedValue({
      displayName: 'Jane Doe',
      emailAddress: 'jane@example.com',
    });

    const user = await api.user();

    expect(user.name).toBe('Jane Doe');
    expect(user.login).toBe('jane@example.com');
    expect(user.email).toBe('jane@example.com');
  });

  it('should fall back to the display name for the login when there is no email', async () => {
    const api = createApi();
    (api as any).requestJSON = vi.fn().mockResolvedValue({ coreAttributes: { DisplayName: { value: 'Jane Doe' } } });

    const user = await api.user();

    expect(user.login).toBe('Jane Doe');
    expect(user.email).toBeUndefined();
  });

  it('should not set an avatar URL when the profile has no avatar', async () => {
    const api = createApi();
    (api as any).requestJSON = vi.fn().mockResolvedValue({ coreAttributes: { DisplayName: { value: 'Jane Doe' } } });

    const user = await api.user();

    expect(user.avatar_url).toBeUndefined();
  });
});
