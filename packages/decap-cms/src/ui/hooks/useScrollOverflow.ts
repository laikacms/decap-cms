import { useEffect, useState } from 'react';

import type { RefObject } from 'react';

export interface ScrollOverflow {
  /** `true` once the element can be scrolled further left (`scrollLeft > 0`). */
  canScrollLeft: boolean;
  /** `true` while `scrollWidth` exceeds `clientWidth` past the current scroll position. */
  canScrollRight: boolean;
}

/**
 * Tracks whether the horizontally-scrollable element referenced by `ref` has
 * content hidden past either edge, so callers can surface a scroll
 * affordance (fade mask, arrow buttons, …) instead of relying on an
 * undiscoverable swipe/drag gesture (DCMS-1512).
 *
 * Recomputes on scroll, on the element's own resize (`ResizeObserver`), and
 * whenever its content changes size (a `MutationObserver` on children, since
 * toolbar items can mount/unmount without the container itself resizing).
 */
export function useScrollOverflow(ref: RefObject<HTMLElement | null>): ScrollOverflow {
  const [overflow, setOverflow] = useState<ScrollOverflow>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      setOverflow({
        canScrollLeft: scrollLeft > 0,
        // 1px slack: some browsers report fractional scrollWidth/clientWidth
        // that differ by <1px at rest, which would otherwise flicker the
        // affordance on at exact fit.
        canScrollRight: scrollLeft + clientWidth < scrollWidth - 1,
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);

    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(element, { childList: true, subtree: true });

    element.addEventListener('scroll', measure, { passive: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      element.removeEventListener('scroll', measure);
    };
  }, [ref]);

  return overflow;
}
