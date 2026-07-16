import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import InViewTrigger from '@/ui/default/InViewTrigger';

/**
 * Regression test for DCMS-548 (#868): `react-waypoint` was replaced with
 * this in-house `IntersectionObserver`-based trigger. Both call sites only
 * ever used the default `onEnter` behavior, so we only need to verify a
 * single intersection fires the callback.
 */
describe('InViewTrigger (DCMS-548)', () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let observerCallback: IntersectionObserverCallback | undefined;
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();
    originalIntersectionObserver = globalThis.IntersectionObserver;

    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = observeMock;
      unobserve = vi.fn();
      disconnect = disconnectMock;
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '';
      thresholds: ReadonlyArray<number> = [];
    }

    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
    observerCallback = undefined;
  });

  it('observes the sentinel on mount', () => {
    render(<InViewTrigger onEnter={vi.fn()} />);
    expect(observeMock).toHaveBeenCalledTimes(1);
  });

  it('fires onEnter once the sentinel intersects the viewport', () => {
    const onEnter = vi.fn();
    render(<InViewTrigger onEnter={onEnter} />);

    expect(onEnter).not.toHaveBeenCalled();

    observerCallback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('does not fire onEnter when the sentinel is not intersecting', () => {
    const onEnter = vi.fn();
    render(<InViewTrigger onEnter={onEnter} />);

    observerCallback?.(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(onEnter).not.toHaveBeenCalled();
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<InViewTrigger onEnter={vi.fn()} />);
    unmount();
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
