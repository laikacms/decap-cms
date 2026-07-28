/**
 * Source of the app-shell service worker (DCMS-1420, MVP slice of #1420).
 *
 * Decap CMS ships as a script tag the host site embeds in its own `admin/`
 * page, so we can't rely on a build step to emit and host a separate
 * `sw.js` next to that page - we don't control the host site's static
 * asset pipeline. Instead this source is registered at runtime from a
 * same-origin blob URL (see `registerServiceWorker.ts`), which lets the
 * worker run with the origin of the page that registered it.
 *
 * Strategy is deliberately simple: cache-first for same-origin GET
 * requests, falling back to the network and opportunistically populating
 * the cache as the admin UI is used. This caches the app shell (the JS/CSS/
 * HTML the admin page already loads) so a previously-visited admin page can
 * reload while offline. It does not precache anything up front, and it does
 * not attempt to cache entries/media fetched from the configured git
 * backend's API - that's a larger follow-up (see the issue for scope notes).
 */
export const APP_SHELL_CACHE_NAME = 'decap-cms-app-shell-v1';

export const serviceWorkerSource = `
const CACHE_NAME = '${APP_SHELL_CACHE_NAME}';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle same-origin, cacheable GET requests. Backend API calls
  // (github.com, gitlab.com, ...) and non-GET requests (writes) are left
  // untouched and go straight to the network.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request).then(cached => {
        const networkFetch = fetch(request)
          .then(response => {
            if (response && response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        // Cache-first: serve instantly from cache when available, and
        // refresh the cache in the background; otherwise wait on network.
        return cached || networkFetch;
      }),
    ),
  );
});
`;
