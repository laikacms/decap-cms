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
    const navigationBlocker = (tx: Transition) => {
      // Check if path is allowed
      const pathname = tx.location.pathname;
      const isAllowed = allowedPaths.some(path => pathname.startsWith(path));
      
      if (isAllowed && tx.action === 'PUSH') {
        tx.retry();
        return;
      }

      if (shouldBlock()) {
        // Block by not calling tx.retry()
        // Show confirmation via window.confirm
        if (window.confirm(message)) {
          tx.retry();
        }
      } else {
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

    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', exitBlocker);
      cleanup();
    };
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
