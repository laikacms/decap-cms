import { unsplashProvider } from './unsplash';

import type { StockPhotoProvider } from './types';

/**
 * Registered stock photo providers, keyed by `media_library.config.provider`.
 * Pexels and Pixabay (see DCMS-1396) are intentionally deferred; add new
 * providers here following the `StockPhotoProvider` interface.
 */
export const stockPhotoProviders: Record<string, StockPhotoProvider> = {
  unsplash: unsplashProvider,
};

export function getStockPhotoProvider(name: string): StockPhotoProvider {
  const provider = stockPhotoProviders[name];
  if (!provider) {
    throw new Error(
      `Unknown stock photo provider "${name}". Available providers: ${Object.keys(stockPhotoProviders).join(', ')}.`,
    );
  }
  return provider;
}

export type { StockPhotoProvider, StockPhotoResult, StockPhotoSearchOptions, StockPhotoSearchResponse } from './types';
