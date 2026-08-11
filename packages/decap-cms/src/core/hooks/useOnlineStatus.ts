import { useEffect, useState } from 'react';

/**
 * Reads `navigator.onLine` and keeps it live via the `online`/`offline`
 * window events. `navigator.onLine` only reflects link-layer connectivity
 * (it can read `true` on a captive portal or a dead Wi-Fi hop), so this is a
 * best-effort signal, not a guarantee the backend is reachable — good enough
 * to drive an "you're offline" indicator (DCMS-1993).
 *
 * SSR-safe: `navigator`/`window` are read lazily inside effects/initializers,
 * never at module scope, so importing this hook has no effect outside the
 * browser. Defaults to `true` when `navigator` is unavailable (server render,
 * some test environments) so the indicator doesn't flash on first paint.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator === 'undefined' ? true : navigator.onLine
  ));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

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
