import { describe, expect, it, vi } from 'vitest';

import { LFS_VERIFY_ERROR } from '@/lib/util/errors/LfsVerifyError';
import { getClient } from '@/backends/git-gateway/netlify-lfs-client';

function makeClientConfig(makeAuthorizedRequest: ReturnType<typeof vi.fn>) {
  return {
    rootURL: 'https://example.com/lfs',
    makeAuthorizedRequest,
    patterns: [],
    enabled: true,
    transformImages: false,
  };
}

describe('netlify-lfs-client resourceExists', () => {
  it('returns true when the verify request succeeds', async () => {
    const makeAuthorizedRequest = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const client = getClient(makeClientConfig(makeAuthorizedRequest));

    await expect(client.resourceExists({ sha: 'abc', size: 1 })).resolves.toBe(true);
  });

  it('returns false when the resource is not found', async () => {
    const makeAuthorizedRequest = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const client = getClient(makeClientConfig(makeAuthorizedRequest));

    await expect(client.resourceExists({ sha: 'abc', size: 1 })).resolves.toBe(false);
  });

  it('throws a distinguishable LfsVerifyError including the status for unexpected statuses', async () => {
    const makeAuthorizedRequest = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const client = getClient(makeClientConfig(makeAuthorizedRequest));

    await expect(client.resourceExists({ sha: 'abc', size: 1 })).rejects.toMatchObject({
      name: LFS_VERIFY_ERROR,
      status: 500,
      message: expect.stringContaining('500'),
    });
  });
});
