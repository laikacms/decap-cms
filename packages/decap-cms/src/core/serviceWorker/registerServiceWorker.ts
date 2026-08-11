import { APP_SHELL_SERVICE_WORKER_SOURCE } from './appShellServiceWorker';

let registrationPromise: Promise<ServiceWorkerRegistration | undefined> | undefined;

/**
 * Self-registers the app-shell caching service worker (DCMS-1993). Called
 * from the `app`/`laika-app` `init()` entry points so any consumer that
 * mounts the CMS gets offline app-shell caching for free — no config option,
 * no extra script tag, no new build output.
 *
 * Safe to call multiple times (e.g. `init()` called again on config swap /
 * HMR): the underlying `register()` call is memoized per module load. Safe
 * to call in non-browser or unsupported environments (SSR, older browsers,
 * most test environments, and any non-secure origin): those all fail the
 * `'serviceWorker' in navigator` guard and this becomes a no-op.
 */
export function registerAppShellServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (registrationPromise) {
    return registrationPromise;
  }

  if (
    typeof navigator === 'undefined'
    || !('serviceWorker' in navigator)
    || typeof window === 'undefined'
  ) {
    registrationPromise = Promise.resolve(undefined);
    return registrationPromise;
  }

  registrationPromise = new Promise(resolve => {
    window.addEventListener('load', () => {
      const blob = new Blob([APP_SHELL_SERVICE_WORKER_SOURCE], { type: 'text/javascript' });
      const scriptUrl = URL.createObjectURL(blob);
      navigator.serviceWorker
        .register(scriptUrl, { scope: '/' })
        .then(resolve)
        .catch(err => {
          // Offline support is a progressive enhancement — a failed
          // registration (blocked by a CSP `worker-src`, an insecure
          // origin, a browser without SW support, etc.) should never break
          // CMS boot.
          console.warn('[decap-cms] app-shell service worker registration failed:', err);
          resolve(undefined);
        });
    });
  });

  return registrationPromise;
}

/** Test-only: clears the memoized registration promise between test cases. */
export function resetServiceWorkerRegistrationForTests(): void {
  registrationPromise = undefined;
}
