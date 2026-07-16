import { useEffect, useState } from 'react';

import type { RefObject } from 'react';

export interface ElementSize {
  width: number | undefined;
  height: number | undefined;
}

/**
 * Tracks the content-box size of the element referenced by `ref` using a
 * plain `ResizeObserver`. Both `width` and `height` are `undefined` until
 * the observer delivers its first entry (DCMS-561).
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: undefined, height: undefined });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
