import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  registerAppShellServiceWorker,
  resetServiceWorkerRegistrationForTests,
  resolveServiceWorkerScope,
  resolveServiceWorkerUrl,
} from './registerServiceWorker';

// DCMS-2002: `navigator.serviceWorker.register()` must never be called with a
// `blob:` URL — every browser rejects that per the Service Worker spec, which
// made the DCMS-1993 offline app-shell cache silently dead on arrival. The
// fix resolves a real same-origin `http:`/`https:` sibling asset instead.
describe('resolveServiceWorkerUrl', () => {
  it('resolves a same-origin sibling of the given page URL', () => {
    expect(resolveServiceWorkerUrl('http://127.0.0.1:8080/dist/decap-cms.js')).toBe(
      'http://127.0.0.1:8080/dist/decap-cms-sw.js',
    );
    expect(resolveServiceWorkerUrl('https://cdn.example.com/app/decap-cms.js')).toBe(
      'https://cdn.example.com/app/decap-cms-sw.js',
    );
  });

  it('returns undefined for a missing/empty/unparsable script URL', () => {
    expect(resolveServiceWorkerUrl(undefined)).toBeUndefined();
    expect(resolveServiceWorkerUrl(null)).toBeUndefined();
    expect(resolveServiceWorkerUrl('')).toBeUndefined();
    expect(resolveServiceWorkerUrl('not a url')).toBeUndefined();
  });
});

// A service worker's registration `scope` can never exceed the directory it
// is served from unless the server sends `Service-Worker-Allowed` — a fixed
// `scope: '/'` throws a `SecurityError` for any script not served from the
// origin root (e.g. `dist/decap-cms-sw.js`), which is the common case for a
// library bundled into a consumer's own static assets.
describe('resolveServiceWorkerScope', () => {
  it("resolves to the script's own directory", () => {
    expect(resolveServiceWorkerScope('http://127.0.0.1:8080/dist/decap-cms-sw.js')).toBe(
      'http://127.0.0.1:8080/dist/',
    );
    expect(resolveServiceWorkerScope('https://example.com/decap-cms-sw.js')).toBe(
      'https://example.com/',
    );
  });
});

describe('registerAppShellServiceWorker', () => {
  afterEach(() => {
    resetServiceWorkerRegistrationForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('registers with a same-origin http(s) URL, never a blob: URL', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' } as ServiceWorkerRegistration);
    vi.stubGlobal('navigator', { serviceWorker: { register } });

    const registration = registerAppShellServiceWorker(
      'http://127.0.0.1:8080/dist/decap-cms-sw.js',
    );
    window.dispatchEvent(new Event('load'));
    await registration;

    expect(register).toHaveBeenCalledTimes(1);
    const [registeredUrl, options] = register.mock.calls[0];
    expect(registeredUrl).toBe('http://127.0.0.1:8080/dist/decap-cms-sw.js');
    expect(new URL(registeredUrl).protocol).not.toBe('blob:');
    expect(new URL(registeredUrl).protocol).toMatch(/^https?:$/);
    expect(options).toEqual({ scope: 'http://127.0.0.1:8080/dist/' });
  });

  it('never calls register() when no service worker URL can be resolved', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    // No `baseURI` on `document` (e.g. a stripped-down/non-standard DOM shim)
    // -> `resolveServiceWorkerUrl` can't derive a sibling URL.
    vi.stubGlobal('document', {});

    const result = await registerAppShellServiceWorker();

    expect(register).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('auto-detects the service worker URL from document.baseURI when no override is given', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' } as ServiceWorkerRegistration);
    vi.stubGlobal('navigator', { serviceWorker: { register } });

    registerAppShellServiceWorker();
    window.dispatchEvent(new Event('load'));
    await registerAppShellServiceWorker();

    expect(register).toHaveBeenCalledTimes(1);
    const [registeredUrl] = register.mock.calls[0];
    expect(new URL(registeredUrl).protocol).toMatch(/^https?:$/);
    expect(new URL(registeredUrl).pathname.endsWith('/decap-cms-sw.js')).toBe(true);
  });

  it('is a no-op when the environment has no serviceWorker support', async () => {
    vi.stubGlobal('navigator', {});

    const result = await registerAppShellServiceWorker('http://example.com/decap-cms-sw.js');

    expect(result).toBeUndefined();
  });

  it('memoizes the registration promise across repeated calls', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' } as ServiceWorkerRegistration);
    vi.stubGlobal('navigator', { serviceWorker: { register } });

    const first = registerAppShellServiceWorker('http://127.0.0.1:8080/dist/decap-cms-sw.js');
    const second = registerAppShellServiceWorker('http://127.0.0.1:8080/dist/other-sw.js');
    window.dispatchEvent(new Event('load'));
    await Promise.all([first, second]);

    expect(register).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });
});
