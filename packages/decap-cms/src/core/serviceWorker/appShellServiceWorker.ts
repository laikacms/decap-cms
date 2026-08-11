/**
 * Source for the app-shell-caching service worker (DCMS-1993), kept as a
 * plain string rather than a separate build entry: the CMS is embedded via a
 * script tag or bundled into a host app's own build, so there's no fixed
 * `dist/` path a consumer's server is guaranteed to serve a `.js` file from.
 * `registerServiceWorker.ts` turns this into a `Blob` and registers it with
 * `navigator.serviceWorker.register()`, which needs no new build output, no
 * new npm `exports` entry, and no consumer-facing config option — it "just
 * works" for any page that calls `init()`.
 *
 * Strategy, deliberately simple for an MVP:
 *  - Navigation requests (the app-shell HTML): network-first, falling back
 *    to the last cached shell when offline.
 *  - Same-origin static assets (script/style/font/image): stale-while-
 *    revalidate — serve from cache immediately if present, refresh the cache
 *    from the network in the background.
 *  - Everything else (cross-origin calls — GitHub/GitLab/etc. APIs, and any
 *    non-GET request) passes straight through to the network, untouched.
 *    Caching CMS/backend data here would risk serving stale content-API
 *    responses; that's out of scope for an app-shell cache.
 *  - `activate` drops any cache from a previous `CACHE_VERSION`, so a new
 *    deploy doesn't accumulate stale shells forever.
 */

export const APP_SHELL_CACHE_PREFIX = 'decap-cms-app-shell';
export const APP_SHELL_CACHE_VERSION = 'v1';
export const APP_SHELL_CACHE_NAME = `${APP_SHELL_CACHE_PREFIX}-${APP_SHELL_CACHE_VERSION}`;

export const APP_SHELL_SERVICE_WORKER_SOURCE = `
const CACHE_NAME = ${JSON.stringify(APP_SHELL_CACHE_NAME)};
const CACHE_PREFIX = ${JSON.stringify(APP_SHELL_CACHE_PREFIX)};

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheableStaticAsset(request) {
  if (request.method !== 'GET') return false;
  const destination = request.destination;
  return (
    destination === 'script'
    || destination === 'style'
    || destination === 'font'
    || destination === 'image'
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || network;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isCacheableStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
`;
