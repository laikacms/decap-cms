import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import { authenticateUser, loginUser, logoutUser, sessionExpired } from '@/core/actions/auth';
import { currentBackend } from '@/core/backend';

/**
 * Keeps the backend session fresh for as long as a user is logged in, so
 * that someone returning after an hour away doesn't run their first action
 * (a keystroke's autosave, a save click) into an expired access token.
 *
 * Started on every successful login/restore; stopped on logout and on
 * session expiry (re-login starts a new watcher). Refreshes are requested:
 * - when the tab becomes visible again (the "came back from lunch" case),
 * - when the browser regains network connectivity,
 * - on a periodic check while the tab stays visible.
 *
 * `Backend.ensureFreshSession` is cheap when the token is still fresh, and
 * an unrecoverably dead session surfaces through the backend's
 * `onSessionExpired` (wired to the re-auth overlay), never through this
 * listener.
 */

const FRESHNESS_CHECK_INTERVAL_MS = 5 * 60_000;

export const sessionListener = createListenerMiddleware();

sessionListener.startListening({
  matcher: isAnyOf(loginUser.fulfilled, authenticateUser.fulfilled),
  effect: async (action, listenerApi) => {
    // `authenticateUser` resolves with null when no stored session exists.
    if (authenticateUser.fulfilled.match(action) && !action.payload) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // One watcher at a time: a re-login replaces the previous session's.
    listenerApi.cancelActiveListeners();

    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      const { config } = listenerApi.getState() as any;
      if (!config || config.isFetching || config.error) return;
      currentBackend(config).ensureFreshSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', refresh);
    const interval = setInterval(refresh, FRESHNESS_CHECK_INTERVAL_MS);

    try {
      await listenerApi.condition(
        other => logoutUser.pending.match(other) || sessionExpired.match(other),
      );
    } finally {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', refresh);
      clearInterval(interval);
    }
  },
});
