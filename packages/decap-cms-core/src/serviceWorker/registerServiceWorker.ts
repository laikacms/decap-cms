import { serviceWorkerSource } from './swSource';

/**
 * Registers the app-shell service worker (DCMS-1420) from an in-memory blob
 * rather than a file on disk, since Decap CMS is embedded into a host site's
 * own `admin/` page and we don't control what else is deployed alongside it.
 * A blob-registered worker still runs same-origin with the registering page,
 * so this works without any change to the host site's deployment.
 *
 * This is a progressive enhancement: unsupported browsers, insecure
 * contexts (service workers require HTTPS or localhost) and registration
 * failures are all handled by silently skipping registration.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !navigator.serviceWorker) {
    return;
  }

  if (!window.isSecureContext) {
    return;
  }

  try {
    const blob = new Blob([serviceWorkerSource], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(blobUrl, { scope: './' }).catch(error => {
        console.warn('[decap-cms] service worker registration failed', error);
      });
    });
  } catch (error) {
    console.warn('[decap-cms] could not set up service worker', error);
  }
}
