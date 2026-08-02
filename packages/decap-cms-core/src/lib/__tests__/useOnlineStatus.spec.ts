import { act, renderHook } from '@testing-library/react';

import { useOnlineStatus } from '../useOnlineStatus';

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('useOnlineStatus', () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    setNavigatorOnLine(originalOnLine);
  });

  it('reflects the initial navigator.onLine value', () => {
    setNavigatorOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('flips to false when an offline event fires', () => {
    setNavigatorOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('flips back to true when an online event fires', () => {
    setNavigatorOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  it('stops listening after unmount', () => {
    setNavigatorOnLine(true);
    const { result, unmount } = renderHook(() => useOnlineStatus());
    unmount();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Value from before unmount is retained; no error is thrown by the
    // (removed) listeners handling a subsequent event.
    expect(result.current).toBe(true);
  });
});
