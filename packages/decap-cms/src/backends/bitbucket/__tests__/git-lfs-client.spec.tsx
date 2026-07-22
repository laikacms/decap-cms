import { describe, expect, it, vi } from 'vitest';

import { GitLfsClient } from '@/backends/bitbucket/git-lfs-client';

function makeClient(patterns: string[]) {
  return new GitLfsClient(true, 'https://example.com/lfs', patterns, vi.fn());
}

describe('GitLfsClient matchPath', () => {
  it('matches an exact filename pattern', () => {
    const client = makeClient(['assets/large-file.bin']);

    expect(client.matchPath('assets/large-file.bin')).toBe(true);
  });

  it('matches a **/*.ext glob pattern', () => {
    const client = makeClient(['**/*.psd']);

    expect(client.matchPath('assets/images/nested/design.psd')).toBe(true);
  });

  it('returns false when no pattern matches', () => {
    const client = makeClient(['**/*.psd', 'assets/large-file.bin']);

    expect(client.matchPath('assets/images/photo.png')).toBe(false);
  });

  it('matches a bare filename pattern against a nested path via matchBase', () => {
    const client = makeClient(['*.bin']);

    expect(client.matchPath('assets/deeply/nested/large-file.bin')).toBe(true);
  });
});
