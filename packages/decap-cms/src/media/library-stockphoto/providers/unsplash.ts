import type { StockPhotoProvider, StockPhotoSearchOptions, StockPhotoSearchResponse } from './types';

const UNSPLASH_API_URL = 'https://api.unsplash.com';

type UnsplashPhoto = {
  id: string,
  description: string | null,
  alt_description: string | null,
  width: number,
  height: number,
  urls: { thumb: string, regular: string, full: string },
  links: { html: string },
  user: { name: string, links: { html: string } },
};

type UnsplashSearchResponse = {
  results: UnsplashPhoto[],
  total_pages: number,
};

/**
 * Provider for https://unsplash.com. Requires a client-supplied Unsplash API
 * access key (`media_library.config.apiKey`); no key ships with this repo.
 * See https://unsplash.com/documentation#search-photos.
 */
export const unsplashProvider: StockPhotoProvider = {
  name: 'unsplash',
  async search(query: string, { apiKey, page = 1, perPage = 20 }: StockPhotoSearchOptions): Promise<
    StockPhotoSearchResponse
  > {
    if (!apiKey) {
      throw new Error(
        "The Unsplash stock photo provider requires 'media_library.config.apiKey' to be set in your CMS config.",
      );
    }

    const url = new URL(`${UNSPLASH_API_URL}/search/photos`);
    url.searchParams.set('query', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${apiKey}`, 'Accept-Version': 'v1' },
    });

    if (!response.ok) {
      throw new Error(`Unsplash search request failed with status ${response.status}`);
    }

    const data = (await response.json()) as UnsplashSearchResponse;

    return {
      totalPages: data.total_pages,
      results: (data.results ?? []).map(photo => {
        const description = photo.description ?? photo.alt_description;
        const photographerUrl = photo.user?.links?.html;
        return {
          id: photo.id,
          thumbUrl: photo.urls.thumb,
          fullUrl: photo.urls.regular,
          downloadUrl: photo.urls.full,
          ...(description === null || description === undefined ? {} : { description }),
          photographerName: photo.user?.name ?? 'Unknown photographer',
          ...(photographerUrl === undefined ? {} : { photographerUrl }),
          providerName: 'Unsplash',
          providerUrl: photo.links?.html ?? 'https://unsplash.com',
          width: photo.width,
          height: photo.height,
        };
      }),
    };
  },
};

export default unsplashProvider;
