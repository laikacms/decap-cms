import { describe, expect, it, vi } from 'vitest';

import { checkImageUrl, isSafeUrl } from '@/widgets/file/withFileControl';

// DCMS-2557: pins the real "Insert from URL" validation for the image widget
// (DCMS-2252). It is `isAbsoluteImageUrl` + a network fetch, not `isSafeUrl`.
describe('image Insert from URL validation', () => {
  it('hard-rejects a URL whose fetch fails (e.g. cross-origin host without CORS headers)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(checkImageUrl('https://cdn.example.com/a.png', { fetchImpl })).resolves.toEqual({
      ok: false,
      error: 'http-error',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects a same-origin relative path for images without fetching', async () => {
    const fetchImpl = vi.fn();

    await expect(checkImageUrl('/uploads/a.png', { fetchImpl })).resolves.toEqual({
      ok: false,
      error: 'invalid-url',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('still accepts the same relative path for the file widget (isSafeUrl)', () => {
    expect(isSafeUrl('/uploads/a.png')).toBe(true);
  });
});
