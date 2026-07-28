import { describe, expect, it } from 'vitest';

import {
  selectAssetCollectionByName,
  selectAssetCollectionForFolder,
  selectAssetCollections,
} from '@/core/lib/assetCollections';

import type { CmsConfig } from '@/lib/util/index';

const config = {
  backend: { name: 'test-repo' },
  collections: [],
  media_folder: 'static/uploads',
  asset_collections: [
    { name: 'photos', label: 'Photos', media_folder: 'static/uploads/photos' },
    { name: 'docs', label: 'Docs', media_folder: 'static/uploads/docs' },
    { name: 'photos-nested', label: 'Photos Nested', media_folder: 'static/uploads/photos/nested' },
  ],
} as unknown as CmsConfig;

describe('selectAssetCollections', () => {
  it('returns the configured asset collections', () => {
    expect(selectAssetCollections(config)).toHaveLength(3);
  });

  it('returns an empty array when config declares none', () => {
    expect(selectAssetCollections({ backend: { name: 'test-repo' }, collections: [] } as CmsConfig))
      .toEqual([]);
  });

  it('returns an empty array for undefined config', () => {
    expect(selectAssetCollections(undefined)).toEqual([]);
  });
});

describe('selectAssetCollectionByName', () => {
  it('finds a collection by name', () => {
    expect(selectAssetCollectionByName(config, 'docs')?.label).toBe('Docs');
  });

  it('returns undefined for an unknown name', () => {
    expect(selectAssetCollectionByName(config, 'nope')).toBeUndefined();
  });

  it('returns undefined when name is not provided', () => {
    expect(selectAssetCollectionByName(config, undefined)).toBeUndefined();
  });
});

describe('selectAssetCollectionForFolder', () => {
  it('matches a folder exactly equal to a collection media_folder', () => {
    expect(selectAssetCollectionForFolder(config, 'static/uploads/docs')?.name).toBe('docs');
  });

  it('matches a subfolder nested under a collection media_folder', () => {
    expect(selectAssetCollectionForFolder(config, 'static/uploads/docs/2026')?.name).toBe('docs');
  });

  it('prefers the most specific (longest) matching media_folder', () => {
    expect(selectAssetCollectionForFolder(config, 'static/uploads/photos/nested/foo')?.name)
      .toBe('photos-nested');
  });

  it('tolerates leading/trailing slashes', () => {
    expect(selectAssetCollectionForFolder(config, '/static/uploads/docs/')?.name).toBe('docs');
  });

  it('returns undefined for a folder outside every collection', () => {
    expect(selectAssetCollectionForFolder(config, 'static/uploads/other')).toBeUndefined();
  });

  it('returns undefined for an empty/undefined folder', () => {
    expect(selectAssetCollectionForFolder(config, undefined)).toBeUndefined();
    expect(selectAssetCollectionForFolder(config, '')).toBeUndefined();
  });
});
