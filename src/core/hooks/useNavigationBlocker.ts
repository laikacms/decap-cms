import { useRef, useCallback } from 'react';

import { history } from '../routing/history';

import type { Transition, Update } from 'history';

interface UseNavigationBlockerOptions {
  /** Function that returns true if navigation should be blocked */
  shouldBlock: () => boolean;
  /** Message to show when blocking navigation */
  message: string;
  /** Callback when navigation is allowed (unblocked) */
  onNavigate?: () => void;
  /** Paths that should not trigger the blocker */
  allowedPaths?: string[];
}

/**
 * Hook for blocking navigation when there are unsaved changes
 * Replaces componentDidMount/componentWillUnmount pattern for navigation blocking
 *
 * This hook sets up:
 * 1. beforeunload event listener for browser close/refresh
 * 2. history.block for in-app navigation
 * 3. history.listen for cleanup after navigation
 */
export function useNavigationBlocker({
  shouldBlock,
  message,
  onNavigate,
  allowedPaths = [],
}: UseNavigationBlockerOptions) {
  const unblockRef = useRef<(() => void) | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const popSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setupBlocker = useCallback(() => {
    // Browser close/refresh blocker
    const exitBlocker = (event: BeforeUnloadEvent) => {
      if (shouldBlock()) {
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', exitBlocker);

    // In-app navigation blocker (history v5 API)
    // IMPORTANT: We must unblock BEFORE calling tx.retry() to prevent infinite loops,
    // because tx.retry() re-triggers the navigation which would call this blocker again.
    const navigationBlocker = (tx: Transition) => {
      // Check if path is allowed
      const pathname = tx.location.pathname;
      const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

      if (isAllowed && tx.action === 'PUSH') {
        unblockRef.current?.();
        tx.retry();
        return;
      }

      if (shouldBlock()) {
        // Block by not calling tx.retry()
        // Show confirmation via window.confirm
        if (window.confirm(message)) {
          unblockRef.current?.();
          tx.retry();
        }
      } else {
        unblockRef.current?.();
        tx.retry();
      }
    };

    unblockRef.current = history.block(navigationBlocker);

    // Cleanup listener (history v5 API: listener receives { location, action })
    unlistenRef.current = history.listen(({ location, action }: Update) => {
      const pathname = location.pathname;
      const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

      if (isAllowed && action === 'PUSH') {
        return;
      }

      onNavigate?.();
      cleanup();
    });

    // POP-navigation safety net (DCMS-286).
    //
    // `history@5`'s own POP handling (used above via `history.block`) can only
    // intercept a browser back/forward navigation when it can find the target
    // location's `idx` in the native history state, i.e. a location it created
    // itself (see history/hash.js `handlePop`). For any other POP — most
    // notably the very first Back the user presses, which lands on whatever
    // history entry existed before this app took over — it just warns
    // ("...block will fail silently in production...") and lets the browser
    // navigate away without ever invoking `navigationBlocker` above, so the
    // guard is silently skipped for exactly the case this hook exists to
    // cover.
    //
    // The native `hashchange` event, unlike `history.block()`/`history.listen`
    // in this failure mode, always fires. Use it to detect when `history`'s
    // internal bookkeeping has fallen out of sync with the real URL, then
    // resync through the SAME shared `history` instance (`history.replace`),
    // which re-stamps `idx` so this location blocks correctly on the next
    // POP. Debounce the check so it doesn't race the multi-tick revert/retry
    // dance `history.block()` runs for the case it CAN handle (idx known) —
    // that dance always settles well within the debounce window.
    const isInSync = () => window.location.href === history.createHref(history.location);
    const getHashPath = () => {
      const raw = window.location.hash;
      return raw.startsWith('#') ? raw.slice(1) || '/' : raw || '/';
    };

    const handleHashChange = () => {
      if (popSyncTimerRef.current) {
        clearTimeout(popSyncTimerRef.current);
      }
      popSyncTimerRef.current = setTimeout(() => {
        popSyncTimerRef.current = null;
        if (isInSync()) {
          return;
        }

        const path = getHashPath();
        const isAllowed = allowedPaths.some(p => path.startsWith(p));

        if (isAllowed || !shouldBlock()) {
          // Hands bookkeeping back to `history`, which fires the `listen`
          // callback registered above (onNavigate/cleanup) as normal.
          history.replace(path);
          return;
        }

        if (window.confirm(message)) {
          history.replace(path);
        } else {
          // Revert the URL bar back to where the app actually is.
          window.location.href = history.createHref(history.location);
        }
      }, 50);
    };
    window.addEventListener('hashchange', handleHashChange);

    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', exitBlocker);
      window.removeEventListener('hashchange', handleHashChange);
      if (popSyncTimerRef.current) {
        clearTimeout(popSyncTimerRef.current);
        popSyncTimerRef.current = null;
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `cleanup` is defined below and itself depends only on stable refs
  }, [shouldBlock, message, onNavigate, allowedPaths]);

  const cleanup = useCallback(() => {
    unblockRef.current?.();
    unlistenRef.current?.();
    unblockRef.current = null;
    unlistenRef.current = null;
  }, []);

  return {
    setupBlocker,
    cleanup,
  };
}
