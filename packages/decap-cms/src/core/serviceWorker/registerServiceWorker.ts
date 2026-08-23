let registrationPromise: Promise<ServiceWorkerRegistration | undefined> | undefined;

/**
 * Resolve the app-shell service worker's same-origin asset URL as a sibling
 * of `pageUrl` — the hosting page's own URL (`document.baseURI`). The asset
 * itself is emitted by `scripts/generate-service-worker-asset.mjs` (from the
 * `APP_SHELL_SERVICE_WORKER_SOURCE` string in `./appShellServiceWorker`) as
 * `decap-cms-sw.js`: next to `dev-test/index.html` for the demo, and at the
 * root of the published package's `dist/` for consumers to serve next to
 * wherever they host their own page (see `resolveServiceWorkerScope` for why
 * "next to the page", not "next to the bundled script", is what makes the
 * broadest scope achievable without extra server config).
 *
 * Resolving against the *page* URL rather than the `<script>` tag's `src`
 * also means this works regardless of how the bundle was loaded — a classic
 * `<script src>` (where `document.currentScript` would be available) or
 * bundled into a consumer's own chunk by whatever bundler they use (where it
 * wouldn't be) — `document.baseURI` is always defined for any document.
 *
 * Every browser rejects `blob:` script URLs for `ServiceWorker.register()`
 * (DCMS-2002) — the script must be fetched same-origin over `http:`/`https:`,
 * hence resolving a real on-disk sibling file instead of inlining the source
 * as a `Blob`. Exported as a pure function so it's unit-testable without a
 * real `document`/`navigator`.
 */
export function resolveServiceWorkerUrl(pageUrl: string | null | undefined): string | undefined {
  if (!pageUrl) {
    return undefined;
  }
  try {
    return new URL('decap-cms-sw.js', pageUrl).href;
  } catch {
    return undefined;
  }
}

/**
 * Default registration `scope` for a service worker served from `scriptUrl`:
 * the script's own directory. Per spec, a service worker's max allowed scope
 * is capped to the directory it's served from unless the server opts in to a
 * wider one via the `Service-Worker-Allowed` response header. Registering
 * with a fixed `'/'` scope against a script not served from the origin root
 * fails outright with a `SecurityError` — deriving `decap-cms-sw.js`'s URL
 * from the *page*'s own URL (see `resolveServiceWorkerUrl`) means this
 * directory is normally the page's own directory (root scope for a page
 * served at the origin root, as in `dev-test/`), which is the widest scope
 * achievable without any consumer-side server configuration.
 */
export function resolveServiceWorkerScope(scriptUrl: string): string {
  return new URL('.', scriptUrl).href;
}

/**
 * Self-registers the app-shell caching service worker (DCMS-1993). Called
 * from the `app` `init()` entry point so any consumer that
 * mounts the CMS gets offline app-shell caching for free, provided the
 * `decap-cms-sw.js` static asset (from `dist/` — see `resolveServiceWorkerUrl`)
 * is served next to their page.
 *
 * When no service worker URL can be resolved (a non-browser environment, or
 * — see `resolveServiceWorkerUrl` — `document.baseURI` being unavailable/
 * unparsable, which practically never happens in a real browser) registration
 * is skipped entirely rather than attempting a fetch against a guessed URL.
 * `scriptUrlOverride` lets a consumer (or a test) point at a specific
 * same-origin URL instead of relying on auto-detection.
 *
 * Safe to call multiple times (e.g. `init()` called again on config swap /
 * HMR): the underlying `register()` call is memoized per module load. Safe
 * to call in non-browser or unsupported environments (SSR, older browsers,
 * most test environments, and any non-secure origin): those all fail the
 * `'serviceWorker' in navigator` guard and this becomes a no-op.
 */
export function registerAppShellServiceWorker(
  scriptUrlOverride?: string,
): Promise<ServiceWorkerRegistration | undefined> {
  if (registrationPromise) {
    return registrationPromise;
  }

  if (
    typeof navigator === 'undefined'
    || !('serviceWorker' in navigator)
    || typeof window === 'undefined'
    || typeof document === 'undefined'
  ) {
    registrationPromise = Promise.resolve(undefined);
    return registrationPromise;
  }

  const scriptUrl = scriptUrlOverride ?? resolveServiceWorkerUrl(document.baseURI);
  if (!scriptUrl) {
    registrationPromise = Promise.resolve(undefined);
    return registrationPromise;
  }

  registrationPromise = new Promise(resolve => {
    window.addEventListener(
      'load',
      () => {
        navigator.serviceWorker
          .register(scriptUrl, { scope: resolveServiceWorkerScope(scriptUrl) })
          .then(resolve)
          .catch(err => {
            // Offline support is a progressive enhancement — a failed
            // registration (blocked by a CSP `worker-src`, an insecure
            // origin, a browser without SW support, a 404 on the sibling
            // asset because the consumer hasn't served it yet, etc.) should
            // never break CMS boot.
            console.warn('[decap-cms] app-shell service worker registration failed:', err);
            resolve(undefined);
          });
      },
      { once: true },
    );
  });

  return registrationPromise;
}

/** Test-only: clears the memoized registration promise between test cases. */
export function resetServiceWorkerRegistrationForTests(): void {
  registrationPromise = undefined;
}
