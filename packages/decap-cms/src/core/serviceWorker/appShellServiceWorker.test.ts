import { describe, expect, it, vi } from 'vitest';

import {
  APP_SHELL_CACHE_NAME,
  APP_SHELL_CACHE_PREFIX,
  APP_SHELL_CACHE_VERSION,
  APP_SHELL_SERVICE_WORKER_SOURCE,
} from './appShellServiceWorker';

const ORIGIN = 'https://cms.example.com';

interface FakeResponse {
  ok: boolean;
  body: string;
  clone: () => FakeResponse;
}

function makeResponse(body: string, ok = true): FakeResponse {
  const response: FakeResponse = { ok, body, clone: () => makeResponse(body, ok) };
  return response;
}

interface FakeRequest {
  url: string;
  method: string;
  mode?: string;
  destination?: string;
}

class FakeCache {
  entries = new Map<string, FakeResponse>();
  match = vi.fn(async (request: FakeRequest) => this.entries.get(request.url));
  put = vi.fn(async (request: FakeRequest, response: FakeResponse) => {
    this.entries.set(request.url, response);
  });
}

type Listener = (event: unknown) => void;

function setup(initialCacheNames: string[] = []) {
  const listeners = new Map<string, Listener>();
  const stores = new Map<string, FakeCache>();
  initialCacheNames.forEach(name => stores.set(name, new FakeCache()));

  const cachesStub = {
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
    open: vi.fn(async (name: string) => {
      let store = stores.get(name);
      if (!store) {
        store = new FakeCache();
        stores.set(name, store);
      }
      return store;
    }),
  };
  const fetchStub = vi.fn<(request: FakeRequest) => Promise<FakeResponse>>();
  const clients = { claim: vi.fn(async () => undefined) };
  const self = {
    location: { origin: ORIGIN },
    clients,
    skipWaiting: vi.fn(),
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
  };

  new Function('self', 'caches', 'fetch', APP_SHELL_SERVICE_WORKER_SOURCE)(
    self,
    cachesStub,
    fetchStub,
  );

  async function activate() {
    let pending: Promise<unknown> | undefined;
    listeners.get('activate')!({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
  }

  async function dispatchFetch(request: FakeRequest) {
    let responded: Promise<FakeResponse> | undefined;
    const respondWith = vi.fn((p: Promise<FakeResponse>) => {
      responded = p;
    });
    listeners.get('fetch')!({ request, respondWith });
    return { respondWith, result: responded };
  }

  return { listeners, stores, cachesStub, fetchStub, clients, self, activate, dispatchFetch };
}

const shellCache = (s: ReturnType<typeof setup>) => s.stores.get(APP_SHELL_CACHE_NAME)!;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('app-shell service worker constants', () => {
  it('composes the cache name from prefix and version', () => {
    expect(APP_SHELL_CACHE_PREFIX).toBe('decap-cms-app-shell');
    expect(APP_SHELL_CACHE_VERSION).toBe('v1');
    expect(APP_SHELL_CACHE_NAME).toBe(`${APP_SHELL_CACHE_PREFIX}-${APP_SHELL_CACHE_VERSION}`);
  });

  it('registers install, activate and fetch listeners and skips waiting on install', () => {
    const s = setup();
    expect([...s.listeners.keys()].sort()).toEqual(['activate', 'fetch', 'install']);
    s.listeners.get('install')!({});
    expect(s.self.skipWaiting).toHaveBeenCalledTimes(1);
  });
});

describe('activate', () => {
  it('deletes only prefixed caches that differ from the current one, then claims clients', async () => {
    const s = setup([
      `${APP_SHELL_CACHE_PREFIX}-v0`,
      `${APP_SHELL_CACHE_PREFIX}-old`,
      APP_SHELL_CACHE_NAME,
      'some-other-cache',
    ]);
    await s.activate();

    expect(s.cachesStub.delete).toHaveBeenCalledTimes(2);
    expect(s.cachesStub.delete).toHaveBeenCalledWith(`${APP_SHELL_CACHE_PREFIX}-v0`);
    expect(s.cachesStub.delete).toHaveBeenCalledWith(`${APP_SHELL_CACHE_PREFIX}-old`);
    expect([...s.stores.keys()].sort()).toEqual([APP_SHELL_CACHE_NAME, 'some-other-cache'].sort());
    expect(s.clients.claim).toHaveBeenCalledTimes(1);
  });

  it('claims clients even with no caches present', async () => {
    const s = setup();
    await s.activate();
    expect(s.cachesStub.delete).not.toHaveBeenCalled();
    expect(s.clients.claim).toHaveBeenCalledTimes(1);
  });
});

describe('navigation requests (network-first)', () => {
  const nav: FakeRequest = { url: `${ORIGIN}/admin/`, method: 'GET', mode: 'navigate' };

  it('returns the network response and caches it when ok', async () => {
    const s = setup();
    const network = makeResponse('fresh');
    s.fetchStub.mockResolvedValue(network);

    const { respondWith, result } = await s.dispatchFetch(nav);
    expect(respondWith).toHaveBeenCalledTimes(1);
    expect(await result).toBe(network);
    await flush();
    expect(shellCache(s).entries.get(nav.url)?.body).toBe('fresh');
  });

  it('does not cache non-ok responses but still returns them', async () => {
    const s = setup();
    const network = makeResponse('nope', false);
    s.fetchStub.mockResolvedValue(network);

    const { result } = await s.dispatchFetch(nav);
    expect(await result).toBe(network);
    await flush();
    expect(shellCache(s).put).not.toHaveBeenCalled();
  });

  it('falls back to the cached shell when the network rejects', async () => {
    const s = setup([APP_SHELL_CACHE_NAME]);
    const cached = makeResponse('cached shell');
    shellCache(s).entries.set(nav.url, cached);
    s.fetchStub.mockRejectedValue(new Error('offline'));

    const { result } = await s.dispatchFetch(nav);
    expect(await result).toBe(cached);
  });

  it('rethrows the network error when nothing is cached', async () => {
    const s = setup();
    s.fetchStub.mockRejectedValue(new Error('offline'));

    const { result } = await s.dispatchFetch(nav);
    await expect(result).rejects.toThrow('offline');
  });
});

describe('static assets (stale-while-revalidate)', () => {
  it.each(['script', 'style', 'font', 'image'])(
    'serves a cached %s immediately and refreshes it in the background',
    async destination => {
      const s = setup([APP_SHELL_CACHE_NAME]);
      const request: FakeRequest = { url: `${ORIGIN}/asset`, method: 'GET', destination };
      shellCache(s).entries.set(request.url, makeResponse('stale'));
      s.fetchStub.mockResolvedValue(makeResponse('fresh'));

      const { respondWith, result } = await s.dispatchFetch(request);
      expect(respondWith).toHaveBeenCalledTimes(1);
      expect((await result)!.body).toBe('stale');
      expect(s.fetchStub).toHaveBeenCalledTimes(1);
      await flush();
      expect(shellCache(s).entries.get(request.url)?.body).toBe('fresh');
    },
  );

  it('returns the network response on cache miss and caches it', async () => {
    const s = setup();
    const request: FakeRequest = { url: `${ORIGIN}/app.js`, method: 'GET', destination: 'script' };
    const network = makeResponse('js');
    s.fetchStub.mockResolvedValue(network);

    const { result } = await s.dispatchFetch(request);
    expect(await result).toBe(network);
    await flush();
    expect(shellCache(s).entries.get(request.url)?.body).toBe('js');
  });

  it('does not cache non-ok network responses', async () => {
    const s = setup();
    const request: FakeRequest = { url: `${ORIGIN}/app.css`, method: 'GET', destination: 'style' };
    const network = makeResponse('err', false);
    s.fetchStub.mockResolvedValue(network);

    const { result } = await s.dispatchFetch(request);
    expect(await result).toBe(network);
    await flush();
    expect(shellCache(s).put).not.toHaveBeenCalled();
  });

  it('resolves to undefined on cache miss when the network fails', async () => {
    const s = setup();
    const request: FakeRequest = { url: `${ORIGIN}/app.js`, method: 'GET', destination: 'script' };
    s.fetchStub.mockRejectedValue(new Error('offline'));

    const { result } = await s.dispatchFetch(request);
    expect(await result).toBeUndefined();
  });

  it('keeps serving the cached copy when the background refresh fails', async () => {
    const s = setup([APP_SHELL_CACHE_NAME]);
    const request: FakeRequest = { url: `${ORIGIN}/app.js`, method: 'GET', destination: 'script' };
    const cached = makeResponse('stale');
    shellCache(s).entries.set(request.url, cached);
    s.fetchStub.mockRejectedValue(new Error('offline'));

    const { result } = await s.dispatchFetch(request);
    expect(await result).toBe(cached);
    await flush();
  });
});

describe('pass-through requests', () => {
  it('never calls respondWith for non-GET requests', async () => {
    const s = setup();
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const { respondWith } = await s.dispatchFetch({
        url: `${ORIGIN}/api`,
        method,
        mode: 'navigate',
        destination: 'script',
      });
      expect(respondWith).not.toHaveBeenCalled();
    }
    expect(s.fetchStub).not.toHaveBeenCalled();
  });

  it('never calls respondWith for cross-origin requests', async () => {
    const s = setup();
    for (const request of [
      { url: 'https://api.github.com/repos/x/y', method: 'GET', destination: '' },
      { url: 'https://cdn.example.org/app.js', method: 'GET', destination: 'script' },
      { url: 'https://other.example.org/', method: 'GET', mode: 'navigate' },
    ]) {
      const { respondWith } = await s.dispatchFetch(request);
      expect(respondWith).not.toHaveBeenCalled();
    }
  });

  it('ignores same-origin GETs that are neither navigations nor static assets', async () => {
    const s = setup();
    const { respondWith } = await s.dispatchFetch({
      url: `${ORIGIN}/api/data.json`,
      method: 'GET',
      destination: '',
    });
    expect(respondWith).not.toHaveBeenCalled();
  });
});
