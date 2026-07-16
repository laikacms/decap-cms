import { describe, expect, it } from 'vitest';

import {
  addAsset,
  addAssets,
  loadAssetFailure,
  loadAssetRequest,
  loadAssetSuccess,
  removeAsset,
} from '@/core/actions/media';
import reducer from '@/core/reducers/medias';
import { createAssetProxy } from '@/core/valueObjects/AssetProxy';

describe('medias', () => {
  const asset = createAssetProxy({ url: 'url', path: 'path' });

  it('should add assets', () => {
    expect(reducer({}, addAssets([asset]))).toEqual({
      path: { asset, isLoading: false, error: null },
    });
  });

  it('should add asset', () => {
    expect(reducer({}, addAsset(asset))).toEqual({
      path: { asset, isLoading: false, error: null },
    });
  });

  it('should remove asset', () => {
    expect(
      reducer({ [asset.path]: { asset, isLoading: false, error: null } }, removeAsset(asset.path)),
    ).toEqual({});
  });

  it('should mark asset as loading', () => {
    expect(reducer({}, loadAssetRequest(asset.path))).toEqual({ path: { isLoading: true } });
  });

  it('should mark asset as not loading', () => {
    expect(reducer({}, loadAssetSuccess(asset.path))).toEqual({
      path: { isLoading: false, error: null },
    });
  });

  it('should set loading error', () => {
    const error = new Error('some error');
    expect(reducer({}, loadAssetFailure(asset.path, error))).toEqual({
      path: { isLoading: false, error },
    });
  });
});
