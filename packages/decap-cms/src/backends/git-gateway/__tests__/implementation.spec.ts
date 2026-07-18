import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import GitGateway from '@/backends/git-gateway/implementation';

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
});
