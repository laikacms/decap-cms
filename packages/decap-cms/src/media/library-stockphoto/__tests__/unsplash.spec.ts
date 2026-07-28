import { beforeEach, describe, expect, it, vi } from 'vitest';

import { unsplashProvider } from '@/media/library-stockphoto/providers/unsplash';

describe('unsplashProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when no apiKey is provided', async () => {
    await expect(unsplashProvider.search('cats', { apiKey: '' })).rejects.toThrow(
      /requires 'media_library.config.apiKey'/,
    );
  });

  it('maps the Unsplash search response into StockPhotoResult objects', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_pages: 3,
        results: [
          {
            id: 'abc123',
            description: 'A cat',
            alt_description: null,
            width: 800,
            height: 600,
            urls: {
              thumb: 'https://example.com/thumb.jpg',
              regular: 'https://example.com/regular.jpg',
              full: 'https://example.com/full.jpg',
            },
            links: { html: 'https://unsplash.com/photos/abc123' },
            user: { name: 'Jane Doe', links: { html: 'https://unsplash.com/@jane' } },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { results, totalPages } = await unsplashProvider.search('cats', {
      apiKey: 'test-key',
      page: 2,
      perPage: 10,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toContain('https://api.unsplash.com/search/photos');
    expect(String(calledUrl)).toContain('query=cats');
    expect(String(calledUrl)).toContain('page=2');
    expect(String(calledUrl)).toContain('per_page=10');
    expect(calledInit.headers.Authorization).toBe('Client-ID test-key');

    expect(totalPages).toBe(3);
    expect(results).toEqual([
      {
        id: 'abc123',
        thumbUrl: 'https://example.com/thumb.jpg',
        fullUrl: 'https://example.com/regular.jpg',
        downloadUrl: 'https://example.com/full.jpg',
        description: 'A cat',
        photographerName: 'Jane Doe',
        photographerUrl: 'https://unsplash.com/@jane',
        providerName: 'Unsplash',
        providerUrl: 'https://unsplash.com/photos/abc123',
        width: 800,
        height: 600,
      },
    ]);
  });

  it('throws a descriptive error when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(unsplashProvider.search('cats', { apiKey: 'bad-key' })).rejects.toThrow(
      /status 401/,
    );
  });
});
