import { useEffect, useState } from 'react';

function getIsOnline() {
  return typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean'
    ? true
    : navigator.onLine;
}

/**
 * Tracks browser connectivity via `navigator.onLine` plus the `online`/`offline`
 * window events (DCMS-1420). This reflects whether the device has a network
 * connection at all; it does not verify that the configured git backend is
 * reachable (see `actions/status.ts` `checkBackendStatus` for that).
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(getIsOnline);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
