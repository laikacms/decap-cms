import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { describe, expect, it } from 'vitest';

import { MEDIA_LIBRARY_CREATE } from '@/core/actions/mediaLibrary';
import { useMediaLibrary } from '@/core/hooks/useMediaLibrary';
import mediaLibraryReducer from '@/core/reducers/mediaLibrary';

// `openMediaLibrary`/`closeMediaLibrary` are real thunks, but with no
// `externalLibrary` configured (the default/uninitialized state exercised
// here) they only dispatch a plain `MEDIA_LIBRARY_OPEN`/`MEDIA_LIBRARY_CLOSE`
// action — no backend or DOM side effects — so the real reducer + real
// action creators are used unmocked to exercise a genuine state transition.
function buildStore() {
  return createStore(combineReducers({ mediaLibrary: mediaLibraryReducer }), applyMiddleware(thunk));
}

function setup() {
  const store = buildStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result, rerender } = renderHook(() => useMediaLibrary(), { wrapper });
  return { store, result, rerender };
}

describe('useMediaLibrary', () => {
  it('returns the documented shape in the default (closed) state', () => {
    const { result } = setup();

    expect(result.current.isExternal).toBeUndefined();
    expect(result.current.useMediaLibrary).toBe(true);
    expect(result.current.showMediaButton).toBe(true);
    expect(result.current.isOpen).toBe(false);
    expect(typeof result.current.open).toBe('function');
    expect(typeof result.current.close).toBe('function');
    expect(result.current.mediaLibrary).toBeDefined();
  });

  it('reports useMediaLibrary: false and isExternal: true when an external library is registered', () => {
    const { store, result, rerender } = setup();

    act(() => {
      store.dispatch({
        type: MEDIA_LIBRARY_CREATE,
        payload: { enableStandalone: () => false },
      } as any);
    });
    rerender();

    expect(result.current.isExternal).toBeTruthy();
    expect(result.current.useMediaLibrary).toBe(false);
  });

  it('open() then close() drives isOpen through a full state-transition', () => {
    const { result, rerender } = setup();
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open({ controlID: 'field-1', forImage: true });
    });
    rerender();

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mediaLibrary.controlID).toBe('field-1');
    expect(result.current.mediaLibrary.forImage).toBe(true);

    act(() => {
      result.current.close();
    });
    rerender();

    expect(result.current.isOpen).toBe(false);
  });
});
