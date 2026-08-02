import { getAssetUrl } from '../index';

jest.mock('decap-cms-lib-util');

describe('getAssetUrl', () => {
  const asset = {
    url: 'http://foo.bar/image.jpg',
    secure_url: 'https://foo.bar/image.jpg',
    public_id: 'image',
    format: 'jpg',
  };

  const assetWithDerived = {
    ...asset,
    derived: [
      {
        url: 'http://derived.foo.bar/image.jpg',
        secure_url: 'https://derived.foo.bar/image.jpg',
      },
    ],
  };

  it('returns `${public_id}.${format}` when output_filename_only is true', () => {
    const result = getAssetUrl(asset, {
      use_secure_url: true,
      use_transformations: true,
      output_filename_only: true,
    });

    expect(result).toEqual(`${asset.public_id}.${asset.format}`);
  });

  it('reads from derived[0] when use_transformations is true and asset.derived is present', () => {
    const result = getAssetUrl(assetWithDerived, {
      use_secure_url: true,
      use_transformations: true,
      output_filename_only: false,
    });

    expect(result).toEqual(assetWithDerived.derived[0].secure_url);
  });

  it('reads from the asset itself, not derived, when use_transformations is false', () => {
    const result = getAssetUrl(assetWithDerived, {
      use_secure_url: true,
      use_transformations: false,
      output_filename_only: false,
    });

    expect(result).toEqual(assetWithDerived.secure_url);
  });

  it('returns the secure_url key when use_secure_url is true', () => {
    const result = getAssetUrl(asset, {
      use_secure_url: true,
      use_transformations: true,
      output_filename_only: false,
    });

    expect(result).toEqual(asset.secure_url);
  });

  it('returns the url key when use_secure_url is false', () => {
    const result = getAssetUrl(asset, {
      use_secure_url: false,
      use_transformations: true,
      output_filename_only: false,
    });

    expect(result).toEqual(asset.url);
  });
});
