import { describe, expect, test } from 'vitest';

import BitbucketBackend from '@/backends/bitbucket/implementation';

import type { CmsBackendInitConfig } from '@/lib/util/index';

function makeConfig(backendOverrides: Record<string, unknown> = {}): CmsBackendInitConfig {
  return {
    backend: {
      name: 'bitbucket',
      repo: 'owner/repo',
      ...backendOverrides,
    },
  } as unknown as CmsBackendInitConfig;
}

describe('bitbucket backend implementation config keys', () => {
  test('defaults api_root to the public Bitbucket API root when unset', () => {
    const backend = new BitbucketBackend(makeConfig());

    expect(backend.apiRoot).toBe('https://api.bitbucket.org/2.0');
  });

  test('reads api_root from backend config when set', () => {
    const backend = new BitbucketBackend(makeConfig({ api_root: 'https://bitbucket.example.com/2.0' }));

    expect(backend.apiRoot).toBe('https://bitbucket.example.com/2.0');
  });

  test('defaults auth_type to an empty string when unset', () => {
    const backend = new BitbucketBackend(makeConfig());

    expect(backend.authType).toBe('');
  });

  test('reads auth_type from backend config when set', () => {
    const backend = new BitbucketBackend(makeConfig({ auth_type: 'implicit' }));

    expect(backend.authType).toBe('implicit');
  });
});
