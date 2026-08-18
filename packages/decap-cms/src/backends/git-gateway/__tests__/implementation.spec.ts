import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import GitGateway from '@/backends/git-gateway/implementation';
import { Cursor } from '@/lib/util/index';

import type { CmsConfig as Config } from '@/lib/util/index';

function makeConfig(backendOverrides: Record<string, unknown> = {}): Config {
  return {
    backend: {
      name: 'git-gateway',
      ...backendOverrides,
    },
    media_folder: 'static/images',
  } as unknown as Config;
}

describe('git-gateway backend implementation config keys', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test('defaults identity_url to /.netlify/identity when unset', () => {
    const backend = new GitGateway(makeConfig());

    expect(backend.apiUrl).toBe('/.netlify/identity');
  });

  test('reads identity_url from backend config when set', () => {
    const backend = new GitGateway(makeConfig({ identity_url: 'https://example.com/identity' }));

    expect(backend.apiUrl).toBe('https://example.com/identity');
  });

  test('defaults gateway_url to /.netlify/git when unset', () => {
    const backend = new GitGateway(makeConfig());

    expect(backend.gatewayUrl).toBe('/.netlify/git');
  });

  test('reads gateway_url from backend config when set', () => {
    const backend = new GitGateway(makeConfig({ gateway_url: 'https://example.com/git' }));

    expect(backend.gatewayUrl).toBe('https://example.com/git');
  });

  test('defaults large_media_url to /.netlify/large-media when unset', () => {
    const backend = new GitGateway(makeConfig());

    expect(backend.netlifyLargeMediaURL).toBe('/.netlify/large-media');
  });

  test('reads large_media_url from backend config when set', () => {
    const backend = new GitGateway(
      makeConfig({ large_media_url: 'https://example.com/large-media' }),
    );

    expect(backend.netlifyLargeMediaURL).toBe('https://example.com/large-media');
  });

  test('defaults status_endpoint to the Netlify status API when unset', () => {
    const backend = new GitGateway(makeConfig());

    expect(backend.gitGatewayStatusEndpoint).toBe(
      'https://www.netlifystatus.com/api/v2/components.json',
    );
  });

  test('reads status_endpoint from backend config when set', () => {
    const backend = new GitGateway(makeConfig({ status_endpoint: 'https://status.example.com' }));

    expect(backend.gitGatewayStatusEndpoint).toBe('https://status.example.com');
  });

  test('defaults auth_type to netlify when unset', () => {
    const backend = new GitGateway(makeConfig());

    expect(backend.authType).toBe('netlify');
  });

  test('uses pkce auth_type when explicitly set', () => {
    const backend = new GitGateway(makeConfig({ auth_type: 'pkce' }));

    expect(backend.authType).toBe('pkce');
  });

  test('defaults branch to master when unset', () => {
    const backend = new GitGateway(makeConfig());

    expect(backend.branch).toBe('master');
  });

  test('reads branch from backend config when set', () => {
    const backend = new GitGateway(makeConfig({ branch: 'main' }));

    expect(backend.branch).toBe('main');
  });

  test('defaults squash_merges to false when unset', () => {
    const backend = new GitGateway(makeConfig());

    expect(backend.squashMerges).toBe(false);
  });

  test('reads squash_merges from backend config when set', () => {
    const backend = new GitGateway(makeConfig({ squash_merges: true }));

    expect(backend.squashMerges).toBe(true);
  });

  test('defaults cms_label_prefix to an empty string when unset', () => {
    const backend = new GitGateway(makeConfig());

    expect(backend.cmsLabelPrefix).toBe('');
  });

  test('reads cms_label_prefix from backend config when set', () => {
    const backend = new GitGateway(makeConfig({ cms_label_prefix: 'cms/' }));

    expect(backend.cmsLabelPrefix).toBe('cms/');
  });

  describe('backend detection from gateway_url suffix', () => {
    test('detects github and strips the suffix from gatewayUrl', () => {
      const backend = new GitGateway(
        makeConfig({ gateway_url: 'https://example.com/.netlify/git/github' }),
      );

      expect(backend.backendType).toBe('github');
      expect(backend.gatewayUrl).toBe('https://example.com/.netlify/git');
    });

    test('detects gitlab and strips the suffix from gatewayUrl', () => {
      const backend = new GitGateway(
        makeConfig({ gateway_url: 'https://example.com/.netlify/git/gitlab' }),
      );

      expect(backend.backendType).toBe('gitlab');
      expect(backend.gatewayUrl).toBe('https://example.com/.netlify/git');
    });

    test('detects bitbucket and strips the suffix from gatewayUrl', () => {
      const backend = new GitGateway(
        makeConfig({ gateway_url: 'https://example.com/.netlify/git/bitbucket' }),
      );

      expect(backend.backendType).toBe('bitbucket');
      expect(backend.gatewayUrl).toBe('https://example.com/.netlify/git');
    });

    test('leaves backendType null when gateway_url has no recognized suffix', () => {
      const backend = new GitGateway(makeConfig({ gateway_url: 'https://example.com/.netlify/git' }));

      expect(backend.backendType).toBeNull();
    });
  });

  describe('authenticate with no backend enabled', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('throws a clear Error, not a TypeError, when /settings reports no enabled backends', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () =>
          Promise.resolve({
            github_enabled: false,
            gitlab_enabled: false,
            bitbucket_enabled: false,
          }),
      } as unknown as Response);

      const backend = new GitGateway(
        makeConfig({ gateway_url: 'https://example.com/.netlify/git' }),
      );
      const user = {
        jwt: () => Promise.resolve('a-token'),
        email: 'user@example.com',
        user_metadata: { full_name: 'Some User', avatar_url: '' },
      };

      await expect(backend.authenticate(user as never)).rejects.toThrow(
        'Git Gateway has no enabled backends. Enable github_enabled, gitlab_enabled, or bitbucket_enabled in Netlify site settings.',
      );
      await expect(backend.authenticate(user as never)).rejects.not.toBeInstanceOf(TypeError);
    });
  });
});

/**
 * Git Gateway owns no storage: it proxies reads to the github/gitlab/bitbucket
 * backend it wraps. What matters at the seam is that entries pass through
 * untouched, so a `BackendEntry` produced by the delegate is what the engine
 * sees.
 */
describe('git-gateway entry reads delegate to the wrapped backend', () => {
  const entry = {
    file: {
      path: 'posts/a.md',
      id: 'sha-a',
      author: { name: 'Ada Lovelace' },
      updatedOn: '2026-01-02T03:04:05Z',
    },
    content: { kind: 'raw' as const, raw: '# A' },
  };

  function gatewayWithDelegate() {
    const backend = new GitGateway(makeConfig());
    const delegate = {
      entriesByFolder: vi.fn(() => Promise.resolve([entry])),
      allEntriesByFolder: vi.fn(() => Promise.resolve([entry])),
      entriesByFiles: vi.fn(() => Promise.resolve([entry])),
      getEntry: vi.fn(() => Promise.resolve(entry)),
      traverseCursor: vi.fn(() => Promise.resolve({ entries: [entry], cursor: Cursor.create({ actions: ['prev'] }) })),
    };
    backend.backend = delegate as never;
    return { backend, delegate };
  }

  test('entriesByFolder passes the folder query through and returns the entries as given', async () => {
    const { backend, delegate } = gatewayWithDelegate();

    await expect(backend.entriesByFolder('posts', 'md', 1)).resolves.toEqual([entry]);
    expect(delegate.entriesByFolder).toHaveBeenCalledWith('posts', 'md', 1);
  });

  test('allEntriesByFolder passes the path filter through', async () => {
    const { backend, delegate } = gatewayWithDelegate();
    const pathRegex = /posts\/.*/;

    await expect(backend.allEntriesByFolder('posts', 'md', 1, pathRegex)).resolves.toEqual([entry]);
    expect(delegate.allEntriesByFolder).toHaveBeenCalledWith('posts', 'md', 1, pathRegex);
  });

  test('entriesByFiles passes the file list through', async () => {
    const { backend, delegate } = gatewayWithDelegate();
    const files = [{ path: 'pages/about.md', id: 'sha-about' }];

    await expect(backend.entriesByFiles(files)).resolves.toEqual([entry]);
    expect(delegate.entriesByFiles).toHaveBeenCalledWith(files);
  });

  test('getEntry returns the delegate entry unchanged', async () => {
    const { backend, delegate } = gatewayWithDelegate();

    await expect(backend.getEntry('posts/a.md')).resolves.toBe(entry);
    expect(delegate.getEntry).toHaveBeenCalledWith('posts/a.md');
  });

  test('traverseCursor passes the cursor and action through', async () => {
    const { backend, delegate } = gatewayWithDelegate();
    const cursor = Cursor.create({ actions: ['next'] });

    const result = await backend.traverseCursor(cursor, 'next');

    expect(result.entries).toEqual([entry]);
    expect(delegate.traverseCursor).toHaveBeenCalledWith(cursor, 'next');
  });
});
