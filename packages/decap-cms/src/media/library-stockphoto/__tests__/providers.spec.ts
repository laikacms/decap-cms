import { describe, expect, it } from 'vitest';

import { getStockPhotoProvider, stockPhotoProviders } from '@/media/library-stockphoto/providers';

describe('getStockPhotoProvider', () => {
  it('returns the registered unsplash provider', () => {
    expect(getStockPhotoProvider('unsplash')).toBe(stockPhotoProviders.unsplash);
  });

  it('throws a descriptive error for unknown providers', () => {
    expect(() => getStockPhotoProvider('pexels')).toThrow(/Unknown stock photo provider "pexels"/);
  });
});
