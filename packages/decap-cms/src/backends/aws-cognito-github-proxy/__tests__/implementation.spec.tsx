import { afterEach, describe, expect, it, vi } from 'vitest';

import AwsCognitoGitHubProxyBackend from '@/backends/aws-cognito-github-proxy/implementation';

import type { CmsConfig } from '@/lib/util/index';

function makeConfig(overrides: Record<string, unknown> = {}): CmsConfig {
  return {
    backend: {
      name: 'aws-cognito-github-proxy',
      repo: 'owner/repo',
      base_url: 'https://auth.example.com',
      ...overrides,
    },
  } as unknown as CmsConfig;
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * This backend is GitHub with a different way in: Cognito issues the token and
 * answers "who is this", everything else (including the whole entry read path)
 * is inherited. The tests cover what it overrides, plus the inheritance itself.
 */
describe('aws-cognito-github-proxy backend', () => {
  it('sends bearer tokens, unlike the github backend it extends', () => {
    const backend = new AwsCognitoGitHubProxyBackend(makeConfig());

    expect(backend.tokenKeyword).toBe('Bearer');
  });

  it('skips the write-access check, since app tokens cannot answer it', () => {
    const backend = new AwsCognitoGitHubProxyBackend(makeConfig());

    expect(backend.bypassWriteAccessCheckForAppTokens).toBe(true);
  });

  it('inherits the github entry read path, so entries cross the seam as raw content', async () => {
    const backend = new AwsCognitoGitHubProxyBackend(makeConfig());
    backend.api = {
      listFiles: vi.fn(() => Promise.resolve([{ id: 'sha-a', path: 'posts/a.md' }])),
      readFile: vi.fn((_path: string, id: string) => Promise.resolve(`content of ${id}`)),
      readFileMetadata: vi.fn(() => Promise.resolve({ author: 'Ada Lovelace', updatedOn: '2026-01-02T03:04:05Z' })),
      originRepoURL: 'originRepoURL',
    } as never;

    const entries = await backend.entriesByFolder('posts', 'md', 1);

    // Spread drops the cursor-compatibility symbol the array also carries.
    expect([...entries]).toEqual([
      {
        file: {
          path: 'posts/a.md',
          id: 'sha-a',
          author: { name: 'Ada Lovelace' },
          updatedOn: '2026-01-02T03:04:05Z',
        },
        content: { kind: 'raw', raw: 'content of sha-a' },
      },
    ]);
  });

  describe('currentUser', () => {
    // Cognito knows the email and nothing else about GitHub, so the acting
    // identity is derived from the configured repo's owner.
    it('reads the identity from the Cognito userInfo endpoint', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(makeConfig());
      global.fetch = vi.fn(() =>
        Promise.resolve({ status: 200, json: () => Promise.resolve({ email: 'ada@example.com' }) })
      ) as never;

      await expect(backend.currentUser({ token: 'cognito-token' })).resolves.toEqual({
        name: 'ada@example.com',
        login: 'owner',
        avatar_url: 'https://github.com/owner.png',
      });

      expect(global.fetch).toHaveBeenCalledWith('https://auth.example.com/oauth2/userInfo', {
        headers: { Authorization: 'Bearer cognito-token' },
      });
    });

    it('names the repo owner, not the repo, as the acting account', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(makeConfig({ repo: 'acme-org/website' }));
      global.fetch = vi.fn(() =>
        Promise.resolve({ status: 200, json: () => Promise.resolve({ email: 'ada@example.com' }) })
      ) as never;

      const user = await backend.currentUser({ token: 'cognito-token' });

      expect(user.login).toBe('acme-org');
      expect(user.avatar_url).toBe('https://github.com/acme-org.png');
    });

    it('logs out and rejects when the token has expired', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(makeConfig());
      const logout = vi.spyOn(backend, 'logout').mockImplementation(() => undefined as never);
      global.fetch = vi.fn(() => Promise.resolve({ status: 401 })) as never;

      await expect(backend.currentUser({ token: 'expired' })).rejects.toBe('Token expired');
      expect(logout).toHaveBeenCalledTimes(1);
    });

    it('asks the userInfo endpoint only once per session', async () => {
      const backend = new AwsCognitoGitHubProxyBackend(makeConfig());
      global.fetch = vi.fn(() =>
        Promise.resolve({ status: 200, json: () => Promise.resolve({ email: 'ada@example.com' }) })
      ) as never;

      await backend.currentUser({ token: 'cognito-token' });
      await backend.currentUser({ token: 'cognito-token' });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('names the pull request author by github login', async () => {
    const backend = new AwsCognitoGitHubProxyBackend(makeConfig());

    await expect(backend.getPullRequestAuthor({ user: { login: 'ada' } } as never)).resolves.toBe(
      'ada',
    );
    await expect(backend.getPullRequestAuthor({} as never)).resolves.toBeUndefined();
  });
});
