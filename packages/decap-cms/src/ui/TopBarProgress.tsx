import { useEffect } from 'react';

// Internal replacement for `react-topbar-progress-indicator` (and its `topbar`
// transitive dependency, dropped to shrink the dependency tree): a thin
// fixed bar across the top of the viewport that trickles toward completion
// while at least one `<TopBarProgress />` is mounted, then fills to 100% and
// fades out when the last one unmounts.
//
// The bar element is a module-level singleton managed outside the React tree:
// the completion animation must outlive the component (callers render it as
// `{isFetching && <TopBarProgress />}`, so the component is already gone when
// the bar finishes), and overlapping mounts/remounts during rapid navigation
// must reuse one bar instead of stacking several.

const TRICKLE_MS = 200;
const REMOVE_DELAY_MS = 500;

let bar: HTMLDivElement | null = null;
let mountCount = 0;
let progress = 0;
let trickleTimer: ReturnType<typeof setInterval> | null = null;
let removeTimer: ReturnType<typeof setTimeout> | null = null;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyProgress(): void {
  if (bar) {
    bar.style.width = `${progress * 100}%`;
  }
}

function startTrickle(): void {
  if (trickleTimer !== null) {
    clearInterval(trickleTimer);
  }
  trickleTimer = setInterval(() => {
    progress = Math.min(progress + (1 - progress) * 0.05, 0.994);
    applyProgress();
  }, TRICKLE_MS);
}

function show(): void {
  mountCount += 1;
  if (removeTimer !== null) {
    clearTimeout(removeTimer);
    removeTimer = null;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Loading');
    bar.dataset.slot = 'top-bar-progress';
    Object.assign(bar.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      height: '2px',
      zIndex: '10000',
      backgroundColor: 'var(--decap-color-active, #3a69c7)',
      pointerEvents: 'none',
    });
    document.body.appendChild(bar);
  }
  bar.style.opacity = '1';
  if (prefersReducedMotion()) {
    // No trickle or fade: a static full-width strip marks the loading state
    // for exactly as long as it lasts.
    bar.style.transition = 'none';
    progress = 1;
    applyProgress();
    return;
  }
  if (mountCount === 1) {
    progress = 0.05;
  }
  bar.style.transition = `width ${TRICKLE_MS}ms linear`;
  applyProgress();
  if (trickleTimer === null) {
    startTrickle();
  }
}

function remove(): void {
  removeTimer = null;
  bar?.remove();
  bar = null;
  progress = 0;
}

function hide(): void {
  mountCount = Math.max(0, mountCount - 1);
  if (mountCount > 0 || !bar) {
    return;
  }
  if (trickleTimer !== null) {
    clearInterval(trickleTimer);
    trickleTimer = null;
  }
  if (prefersReducedMotion()) {
    remove();
    return;
  }
  progress = 1;
  bar.style.transition = 'width 150ms ease-out, opacity 250ms ease 250ms';
  bar.style.opacity = '0';
  applyProgress();
  removeTimer = setTimeout(remove, REMOVE_DELAY_MS);
}

/**
 * Renders nothing itself; while mounted, a slim indeterminate progress bar is
 * shown fixed to the top of the viewport. Multiple concurrent instances share
 * one bar, which completes and fades out once the last instance unmounts.
 */
export function TopBarProgress(): null {
  useEffect(() => {
    show();
    return hide;
  }, []);
  return null;
}
