/**
 * `getAsset` must hand out a new function once asset loads settle.
 *
 * DCMS-1036 moved `getAsset()` out of render into effects keyed on
 * `[value, field, getAsset]` (image control, image preview, entry card), while
 * `boundGetAsset` stays memoized per collection. Together that froze every image
 * that was not cached at mount on the empty placeholder SVG: the load finished,
 * the asset landed in `state.medias`, and nothing re-ran the effect. Seen live as
 * every thumbnail in the editor being the same empty `blob:` image.
 *
 * Real store, real `getAsset` thunk, real `medias` reducer, real ImagePreview.
 */
import { act, render, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addAsset, boundGetAsset, loadAssetFailure, loadAssetRequest, loadAssetSuccess } from '@/core/actions/media';
import { useGetAsset } from '@/core/hooks/useGetAsset';
import mediasReducer from '@/core/reducers/medias';
import { createAssetProxy } from '@/core/valueObjects/AssetProxy';
import ImagePreview from '@/widgets/image/ImagePreview';

import type { Medias } from '@/core/reducers/medias';
import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@/lib/util/index';

// The empty placeholder asset is built when `@/core/actions/media` is imported,
// so the object-URL stub has to be in place before the imports run.
vi.hoisted(() => {
  URL.createObjectURL = ((file: File) => `blob:${file.name}`) as typeof URL.createObjectURL;
});

const PATH = 'assets/uploads/photo.jpg';
const PUBLIC_URL = 'https://assets.example.com/photo.jpg';

const field = { name: 'image', widget: 'image' } as unknown as CmsEntryField;
const entry = { slug: 'home', data: {} } as unknown as CmsEntry;

function buildStore(medias: Medias) {
  return createStore(
    combineReducers({
      config: (state: unknown = { media_folder: 'assets/uploads' }) => state,
      medias: mediasReducer,
    }),
    { medias } as never,
    applyMiddleware(thunk),
  );
}

// A fresh collection per test: `boundGetAsset` memoizes on the collection and
// would otherwise keep dispatching into the previous test's store.
function newCollection() {
  return { name: 'pages', folder: 'content/pages' } as unknown as CmsCollectionState;
}

describe('useGetAsset', () => {
  beforeEach(() => {
    boundGetAsset.cache.clear();
  });

  it('swaps the empty placeholder for the real image once the load settles', () => {
    const store = buildStore({ [PATH]: { asset: undefined, isLoading: true, error: null } });
    const collection = newCollection();

    function Thumbnail() {
      const getAsset = useGetAsset(collection, entry);
      return <ImagePreview value="photo.jpg" field={field} getAsset={getAsset} />;
    }

    const { container } = render(
      <Provider store={store}>
        <Thumbnail />
      </Provider>,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:empty.svg');

    act(() => {
      store.dispatch(addAsset(createAssetProxy({ path: PATH, url: PUBLIC_URL })));
      store.dispatch(loadAssetSuccess(PATH));
    });

    expect(container.querySelector('img')?.getAttribute('src')).toBe(PUBLIC_URL);
  });

  it('hands out a new function when loads settle, also on failure', () => {
    const store = buildStore({});
    const collection = newCollection();
    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useGetAsset(collection, entry), { wrapper });

    const beforeLoad = result.current;
    act(() => {
      store.dispatch(loadAssetRequest(PATH));
    });
    const whileLoading = result.current;
    act(() => {
      store.dispatch(loadAssetFailure(PATH, new Error('404')));
    });

    expect(whileLoading).not.toBe(beforeLoad);
    expect(result.current).not.toBe(whileLoading);
  });

  it('keeps the same function across re-renders while nothing settles', () => {
    const store = buildStore({});
    const collection = newCollection();
    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
    // A new entry object per render mimics typing in the editor.
    const { result, rerender } = renderHook(
      ({ current }: { current: CmsEntry }) => useGetAsset(collection, current),
      { wrapper, initialProps: { current: entry } },
    );

    const first = result.current;
    rerender({ current: { ...entry, data: { title: 'typed' } } as unknown as CmsEntry });

    expect(result.current).toBe(first);
  });
});
