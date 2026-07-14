import { beforeEach, describe, expect, it, vi } from 'vitest';
import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';

import { getAsset, boundGetAsset, ADD_ASSET, LOAD_ASSET_REQUEST } from '@/core/actions/media';
import { selectMediaFilePath } from '@/core/reducers/entries';
import AssetProxy from '@/core/valueObjects/AssetProxy';

import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { Mock } from 'vitest';

type State = any;

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
    // @ts-expect-error -- TODO: fix underlying type issue
    global.URL = { createObjectURL: vi.fn() };

    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should return empty asset for null path', () => {
      const store = mockStore({});

      const payload = { collection: null, entryPath: null, entry: null, path: null };

      // @ts-expect-error -- TODO: fix underlying type issue
      const result = store.dispatch(getAsset(payload));
      const actions = store.getActions();
      expect(actions).toHaveLength(0);
      expect(result).toEqual(emptyAsset);
    });

    it('should return asset from medias state', () => {
      const path = 'static/media/image.png';
      const asset = new AssetProxy({ file: new File([], 'empty'), path });
      const store = mockStore({
        // @ts-expect-error -- TODO: fix underlying type issue
        config: {},
        medias: {
          [path]: { asset, isLoading: false, error: null },
        },
      });

      mockedSelectMediaFilePath.mockReturnValue(path);
      const payload = { collection: {}, entry: { path: 'entryPath' }, path };

      // @ts-expect-error -- TODO: fix underlying type issue
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
      const payload = { collection: null, entryPath: null, path };

      // @ts-expect-error -- TODO: fix underlying type issue
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
      const payload = { path };

      // @ts-expect-error -- TODO: fix underlying type issue
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
      const payload = { path };

      // @ts-expect-error -- TODO: fix underlying type issue
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
});
