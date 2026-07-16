import React, { useEffect, useRef } from 'react';

export interface InViewTriggerProps {
  /** Called once the sentinel element scrolls into the viewport. */
  onEnter: () => void;
}

/**
 * Minimal `react-waypoint` replacement (DCMS-548 / #868). Renders an
 * invisible sentinel and fires `onEnter` the first time it intersects the
 * viewport, matching the default `Waypoint onEnter` behavior our call sites
 * relied on (no offsets, no scrollable-ancestor support, no `onLeave`).
 *
 * Remount the component (e.g. via a changing `key`) to re-arm the trigger.
 */
function InViewTrigger({ onEnter }: InViewTriggerProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        onEnterRef.current();
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={sentinelRef} />;
}

export default InViewTrigger;
