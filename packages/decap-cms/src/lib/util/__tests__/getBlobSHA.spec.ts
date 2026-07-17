import { afterEach, describe, expect, it, vi } from 'vitest';

import getBlobSHA from '@/lib/util/getBlobSHA';

describe('getBlobSHA', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hashes a known input to its known SHA-256 hex digest', async () => {
    const blob = new Blob(['hello']);
    // echo -n "hello" | shasum -a 256
    expect(await getBlobSHA(blob)).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('hashes an empty blob to the SHA-256 digest of the empty string', async () => {
    const blob = new Blob([]);
    // echo -n "" | shasum -a 256
    expect(await getBlobSHA(blob)).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('throws when the Web Crypto API is unavailable', async () => {
    vi.stubGlobal('crypto', undefined);

    const blob = new Blob(['hello']);
    await expect(getBlobSHA(blob)).rejects.toThrow(
      'No suitable hashing method available. Please ensure you are running in an environment that supports the Web Crypto API or Node.js crypto module.',
    );
  });
});
