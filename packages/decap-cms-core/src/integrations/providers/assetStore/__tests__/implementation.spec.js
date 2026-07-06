import { fromJS } from 'immutable';

import AssetStore from '../implementation';

function createAssetStore(config = {}, getToken = jest.fn()) {
  return new AssetStore(
    fromJS({
      getSignedFormURL: 'https://api.example.com/sign',
      ...config,
    }),
    getToken,
  );
}

describe('AssetStore integration', () => {
  describe('constructor', () => {
    it('throws when getSignedFormURL is missing from the config', () => {
      expect(() => new AssetStore(fromJS({}), jest.fn())).toThrow(
        'The AssetStore integration needs the getSignedFormURL in the integration configuration.',
      );
    });

    it('trims a trailing slash from getSignedFormURL and defaults shouldConfirmUpload to false', () => {
      const assetStore = createAssetStore({
        getSignedFormURL: 'https://api.example.com/sign/',
      });

      expect(assetStore.getSignedFormURL).toEqual('https://api.example.com/sign');
      expect(assetStore.shouldConfirmUpload).toEqual(false);
    });

    it('reads shouldConfirmUpload from the config when provided', () => {
      const assetStore = createAssetStore({ shouldConfirmUpload: true });

      expect(assetStore.shouldConfirmUpload).toEqual(true);
    });
  });

  describe('urlFor', () => {
    it('returns the path unchanged when there are no params', () => {
      const assetStore = createAssetStore();

      expect(assetStore.urlFor('/assets', {})).toEqual('/assets');
    });

    it('appends a single param as a query string', () => {
      const assetStore = createAssetStore();

      expect(assetStore.urlFor('/assets', { params: { page: 1 } })).toEqual('/assets?page=1');
    });

    it('appends multiple params joined by & and URL-encodes values', () => {
      const assetStore = createAssetStore();

      expect(
        assetStore.urlFor('/assets', {
          params: { search: 'a query with spaces', page: 2 },
        }),
      ).toEqual('/assets?search=a%20query%20with%20spaces&page=2');
    });
  });

  describe('requestHeaders', () => {
    it('returns an empty object when called with no arguments', () => {
      const assetStore = createAssetStore();

      expect(assetStore.requestHeaders()).toEqual({});
    });

    it('passes through the given headers', () => {
      const assetStore = createAssetStore();

      expect(
        assetStore.requestHeaders({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        }),
      ).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      });
    });
  });

  describe('parseJsonResponse', () => {
    it('resolves with the parsed JSON body when the response is ok', async () => {
      const assetStore = createAssetStore();
      const response = {
        ok: true,
        json: () => Promise.resolve({ id: 'asset-1' }),
      };

      await expect(assetStore.parseJsonResponse(response)).resolves.toEqual({ id: 'asset-1' });
    });

    it('rejects with the parsed JSON body when the response is not ok', async () => {
      const assetStore = createAssetStore();
      const response = {
        ok: false,
        json: () => Promise.resolve({ message: 'Upload failed' }),
      };

      await expect(assetStore.parseJsonResponse(response)).rejects.toEqual({
        message: 'Upload failed',
      });
    });
  });
});
