import { useCallback, useRef } from 'react';

import { useRouter } from '@/core/routing/context';
import { confirmDialog } from '@/ui';

import type { RouterTransition, RouterUpdate } from '@/core/routing/router';

interface UseNavigationBlockerOptions {
  /** Function that returns true if navigation should be blocked */
  shouldBlock: () => boolean;
  /** Message to show when blocking navigation */
  message: string;
  /** Confirm dialog heading; defaults to "Unsaved changes" (DCMS-1471) */
  title?: string;
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
 * 2. router.block for in-app navigation (covers PUSH/REPLACE and POP-type
 *    navigation such as browser back/forward and direct hash edits; the
 *    router reverts a blocked POP's URL change before the blocker runs)
 * 3. router.subscribe for cleanup after navigation
 */
export function useNavigationBlocker({
  shouldBlock,
  message,
  title = 'Unsaved changes',
  onNavigate,
  allowedPaths = [],
}: UseNavigationBlockerOptions) {
  const router = useRouter();
  const unblockRef = useRef<(() => void) | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  // Aborts any confirm dialog queued by this armed session's navigationBlocker
  // when setupBlocker's cleanup runs (caller unmounted or a subsequent route
  // change abandons the still-pending prompt), so it auto-settles as `false`
  // and drains from `ConfirmDialogHost`'s queue instead of leaving a
  // dangling, click-blocking `AlertDialog` mounted at the app root forever
  // (DCMS-1063/DCMS-1804).
  const confirmAbortControllerRef = useRef<AbortController | null>(null);

  const setupBlocker = useCallback(() => {
    const confirmAbortController = new AbortController();
    confirmAbortControllerRef.current = confirmAbortController;

    // Browser close/refresh blocker
    const exitBlocker = (event: BeforeUnloadEvent) => {
      if (shouldBlock()) {
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', exitBlocker);

    // In-app navigation blocker.
    // IMPORTANT: We must unblock BEFORE calling tx.retry() to prevent infinite loops,
    // because tx.retry() re-triggers the navigation which would call this blocker again.
    const navigationBlocker = async (tx: RouterTransition) => {
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
        // Show confirmation via the AlertDialog-backed confirm (DCMS-658),
        // scoped to this armed session's AbortSignal so a second navigation
        // that abandons this prompt (DCMS-1804) settles it instead of
        // leaking the dialog.
        if (await confirmDialog(message, { title }, confirmAbortController.signal)) {
          unblockRef.current?.();
          tx.retry();
        }
      } else {
        unblockRef.current?.();
        tx.retry();
      }
    };

    // `block` is optional on the Router port; without it the guard degrades
    // to the `beforeunload` handler above.
    unblockRef.current = router.block?.(navigationBlocker) ?? null;

    // Cleanup listener (receives { location, action } on every navigation)
    unlistenRef.current = router.subscribe(({ location, action }: RouterUpdate) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `cleanup` is defined below and itself depends only on stable refs
  }, [shouldBlock, message, title, onNavigate, allowedPaths, router]);

  const cleanup = useCallback(() => {
    unblockRef.current?.();
    unlistenRef.current?.();
    unblockRef.current = null;
    unlistenRef.current = null;
    // Auto-settle any confirmDialog left pending by an abandoned transition
    // (e.g. a second navigation, such as browser back, landing while the
    // "Unsaved changes" prompt is still open) so it resolves `false` and
    // ConfirmDialogHost unmounts its AlertDialog instead of leaking the
    // backdrop (DCMS-1804). A no-op if the prompt already settled normally.
    confirmAbortControllerRef.current?.abort();
    confirmAbortControllerRef.current = null;
  }, []);

  return {
    setupBlocker,
    cleanup,
  };
}
