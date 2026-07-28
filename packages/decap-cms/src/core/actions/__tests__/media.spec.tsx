import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADD_ASSET, boundGetAsset, getAsset, loadAsset, LOAD_ASSET_REQUEST } from '@/core/actions/media';
import { getMediaDisplayURL, getMediaFile, waitForMediaLibraryToLoad } from '@/core/actions/mediaLibrary';
import { selectMediaFilePath } from '@/core/reducers/entries';
import AssetProxy from '@/core/valueObjects/AssetProxy';

import type { Medias } from '@/core/reducers/medias';
import type { CmsConfig } from '@/lib/util/index';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { Mock } from 'vitest';

// Minimal slice of the root reducer state actually touched by these tests
// (`getAsset` only reads `state.config` and `state.medias`; `loadAsset` also
// reads `state.mediaLibrary` and `state.integrations` via the real,
// unmocked `selectMediaFileByPath`).
type State = {
  config: Partial<CmsConfig>,
  medias: Medias,
  mediaLibrary?: { files: unknown[] },
  integrations?: { hooks: Record<string, unknown> },
};

// `getAsset`'s own args are typed against the real (non-test) `collection`/
// `entry` shapes, which don't model the null/partial fixtures these tests
// exercise (e.g. DCMS-313's nullish-collection-on-mount case), so payloads
// are cast to this alias rather than widening the production types.
type GetAssetPayload = Parameters<typeof getAsset>[0];

const middlewares = [thunk];
const mockStore = configureMockStore<Partial<State>, ThunkDispatch<State, {}, AnyAction>>(
  middlewares,
);
const mockedSelectMediaFilePath = selectMediaFilePath as Mock;

vi.mock('../../reducers/entries');
vi.mock('../mediaLibrary');

describe('media', () => {
  const emptyAsset = new AssetProxy({
    path: 'empty.svg',
    file: new File([`<svg xmlns="http://www.w3.org/2000/svg"></svg>`], 'empty.svg', {
      type: 'image/svg+xml',
    }),
  });

  describe('getAsset', () => {
    global.URL = { createObjectURL: vi.fn() } as unknown as typeof URL;

    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should return empty asset for null path', () => {
      const store = mockStore({});

      const payload = {
        collection: null,
        entryPath: null,
        entry: null,
        path: null,
      } as unknown as GetAssetPayload;

      const result = store.dispatch(getAsset(payload));
      const actions = store.getActions();
      expect(actions).toHaveLength(0);
      expect(result).toEqual(emptyAsset);
    });

    it('should return asset from medias state', () => {
      const path = 'static/media/image.png';
      const asset = new AssetProxy({ file: new File([], 'empty'), path });
      const store = mockStore({
        config: {},
        medias: {
          [path]: { asset, isLoading: false, error: null },
        },
      });

      mockedSelectMediaFilePath.mockReturnValue(path);
      const payload = {
        collection: {},
        entry: { path: 'entryPath' },
        path,
      } as unknown as GetAssetPayload;

      const result = store.dispatch(getAsset(payload));
      const actions = store.getActions();
      expect(actions).toHaveLength(0);

      expect(result).toBe(asset);
      expect(mockedSelectMediaFilePath).toHaveBeenCalledTimes(1);
      expect(mockedSelectMediaFilePath).toHaveBeenCalledWith(
        store.getState().config,
        payload.collection,
        payload.entry,
        path,
        undefined,
      );
    });

    it('should create asset for absolute path when not in medias state', () => {
      const path = 'https://asset.netlify.com/image.png';

      const asset = new AssetProxy({ url: path, path });
      const store = mockStore({
        medias: {},
      });

      mockedSelectMediaFilePath.mockReturnValue(path);
      const payload = {
        collection: null,
        entryPath: null,
        path,
      } as unknown as GetAssetPayload;

      const result = store.dispatch(getAsset(payload));
      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        type: ADD_ASSET,
        payload: asset,
      });
      expect(result).toEqual(asset);
    });

    it('should return empty asset and initiate load when not in medias state', () => {
      const path = 'static/media/image.png';
      const store = mockStore({
        medias: {},
      });

      mockedSelectMediaFilePath.mockReturnValue(path);
      const payload = { path } as unknown as GetAssetPayload;

      const result = store.dispatch(getAsset(payload));
      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        type: LOAD_ASSET_REQUEST,
        payload: { path },
      });
      expect(result).toEqual(emptyAsset);
    });

    it('should return asset with original path on load error', () => {
      const path = 'static/media/image.png';
      const resolvePath = 'resolvePath';
      const store = mockStore({
        medias: {
          [resolvePath]: {
            asset: undefined,
            error: new Error('test'),
            isLoading: false,
          },
        },
      });

      mockedSelectMediaFilePath.mockReturnValue(resolvePath);
      const payload = { path } as unknown as GetAssetPayload;

      const result = store.dispatch(getAsset(payload));
      const actions = store.getActions();

      const asset = new AssetProxy({ url: path, path: resolvePath });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        type: ADD_ASSET,
        payload: asset,
      });
      expect(result).toEqual(asset);
    });
  });

  describe('boundGetAsset', () => {
    it('does not throw when called with a nullish collection (DCMS-313 new-entry mount)', () => {
      const store = mockStore({});
      const dispatch = store.dispatch as unknown as ThunkDispatch<State, {}, AnyAction>;

      expect(() => boundGetAsset(dispatch, undefined as unknown as never, undefined as unknown as never)).not.toThrow();
      expect(() => boundGetAsset(dispatch, null as unknown as never, null as unknown as never)).not.toThrow();

      const bound = boundGetAsset(dispatch, undefined as unknown as never, undefined as unknown as never);
      expect(typeof bound).toBe('function');
    });
  });

  describe('loadAsset', () => {
    const mockedWaitForMediaLibraryToLoad = waitForMediaLibraryToLoad as Mock;
    const mockedGetMediaDisplayURL = getMediaDisplayURL as Mock;
    const mockedGetMediaFile = getMediaFile as Mock;

    beforeEach(() => {
      vi.resetAllMocks();
      mockedWaitForMediaLibraryToLoad.mockResolvedValue(undefined);
    });

    // DCMS-1617: since PR #1579, `state.mediaLibrary.files` interleaves
    // folder entries (`isDirectory: true`, `displayURL: { id, path }`)
    // alongside leaf files. Before the fix, `selectMediaFileByPath` returned
    // the folder entry and `loadAsset` handed it to `getMediaDisplayURL`,
    // which dispatches `MEDIA_DISPLAY_URL_FAILURE` once the backend rejects
    // the non-string `displayURL`.
    it('does not resolve a folder entry as the media file for a matching path', async () => {
      const folderPath = 'assets/uploads/photos';
      const folderEntry = {
        id: 'folder-1',
        name: 'photos',
        path: folderPath,
        displayURL: { id: 'folder-1', path: folderPath },
        isDirectory: true,
      };
      mockedGetMediaFile.mockResolvedValue({ url: 'fallback-url' });

      const store = mockStore({
        config: {},
        medias: {},
        mediaLibrary: { files: [folderEntry] },
        integrations: { hooks: {} },
      });

      await store.dispatch(loadAsset(folderPath) as unknown as AnyAction);

      const actions = store.getActions();
      // The folder must never reach getMediaDisplayURL...
      expect(mockedGetMediaDisplayURL).not.toHaveBeenCalled();
      // ...and no MEDIA_DISPLAY_URL_FAILURE (or any load failure) should be dispatched.
      expect(actions.some(a => a.type === 'MEDIA_DISPLAY_URL_FAILURE')).toBe(false);
      expect(actions.some(a => a.type === 'LOAD_ASSET_FAILURE')).toBe(false);
      // Falls through to the leaf-file lookup instead.
      expect(mockedGetMediaFile).toHaveBeenCalledWith(store.getState(), folderPath);
      expect(actions).toContainEqual({
        type: ADD_ASSET,
        payload: new AssetProxy({ path: folderPath, url: 'fallback-url' }),
      });
    });
  });
});
