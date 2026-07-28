/**
 * Tests for qrLogin.ts (DCMS-1401 — QR-based "quick mobile access" login).
 *
 * `@/lib/util/index` is mocked the same way `laika-backend.spec.ts` mocks it,
 * so these tests are hermetic and don't touch a real network. `laikacms/core`
 * is mocked with a minimal `Url` implementation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { ACCESS_TOKEN_ERROR } = vi.hoisted(() => ({ ACCESS_TOKEN_ERROR: 'ACCESS_TOKEN_ERROR' }));

vi.mock('@/lib/util/index', () => ({
  AccessTokenError: class AccessTokenError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = ACCESS_TOKEN_ERROR;
    }
  },
  unsentRequest: {
    fetchWithTimeout: vi.fn(),
  },
}));

vi.mock('laikacms/core', () => ({
  Url: {
    normalize: (url: string) => url.replace(/\/$/, ''),
    combine: (base: string, path?: string) => (path ? `${base}/${path.replace(/^\//, '')}` : base),
  },
}));

import { unsentRequest } from '@/lib/util/index';
import {
  buildQrLoginDeepLink,
  clearQrLoginCodeFromLocation,
  exchangeQrTransferCode,
  QR_LOGIN_QUERY_PARAM,
  QR_TRANSFER_CODE_TTL_SECONDS,
  readQrLoginCodeFromLocation,
  requestQrTransferCode,
  resolveLaikaApiUrl,
} from '@/backends/laika/qrLogin';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('resolveLaikaApiUrl', () => {
  it('combines base_url and api_root', () => {
    expect(
      resolveLaikaApiUrl({ backend: { base_url: 'https://api.example.com/', api_root: '/api' } }),
    ).toBe('https://api.example.com/api');
  });

  it('falls back to the legacy api_url alias when api_root is absent', () => {
    expect(
      resolveLaikaApiUrl({ backend: { base_url: 'https://api.example.com', api_url: 'api' } }),
    ).toBe('https://api.example.com/api');
  });
});

describe('requestQrTransferCode', () => {
  beforeEach(() => {
    vi.mocked(unsentRequest.fetchWithTimeout).mockReset();
  });

  it('POSTs with the bearer token and returns the minted code + estimated expiry', async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    vi.mocked(unsentRequest.fetchWithTimeout).mockResolvedValue(
      jsonResponse(201, { data: { attributes: { code: 'abc123', expires_in: 90 } } }),
    );

    const result = await requestQrTransferCode('https://api.example.com', 'my-access-token');

    expect(result).toEqual({ code: 'abc123', expiresAt: now + 90_000 });
    expect(unsentRequest.fetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/session/transfer',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer my-access-token' }),
      }),
    );

    vi.useRealTimers();
  });

  it('falls back to the requested TTL when the server omits expires_in', async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    vi.mocked(unsentRequest.fetchWithTimeout).mockResolvedValue(
      jsonResponse(201, { code: 'flat-shape-code' }),
    );

    const result = await requestQrTransferCode('https://api.example.com', 'token');

    expect(result).toEqual({
      code: 'flat-shape-code',
      expiresAt: now + QR_TRANSFER_CODE_TTL_SECONDS * 1000,
    });

    vi.useRealTimers();
  });

  it('throws AccessTokenError on a non-ok response', async () => {
    vi.mocked(unsentRequest.fetchWithTimeout).mockResolvedValue(jsonResponse(401, {}));

    await expect(requestQrTransferCode('https://api.example.com', 'token')).rejects.toThrow(
      /Failed to create QR login transfer code/,
    );
  });

  it('throws AccessTokenError when the response has no code', async () => {
    vi.mocked(unsentRequest.fetchWithTimeout).mockResolvedValue(jsonResponse(201, {}));

    await expect(requestQrTransferCode('https://api.example.com', 'token')).rejects.toThrow(
      /did not include a code/,
    );
  });
});

describe('exchangeQrTransferCode', () => {
  beforeEach(() => {
    vi.mocked(unsentRequest.fetchWithTimeout).mockReset();
  });

  it('POSTs the code unauthenticated and returns Decap-shaped credentials', async () => {
    vi.mocked(unsentRequest.fetchWithTimeout).mockResolvedValue(
      jsonResponse(200, { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }),
    );

    const credentials = await exchangeQrTransferCode('https://api.example.com', 'the-code');

    expect(credentials).toEqual({
      token: 'new-access',
      refresh_token: 'new-refresh',
      expires_in: 3600,
    });

    const [url, options] = vi.mocked(unsentRequest.fetchWithTimeout).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/session/transfer/exchange');
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(options.body as string)).toEqual({ code: 'the-code' });
  });

  it('throws AccessTokenError when the code is invalid/expired/already used', async () => {
    vi.mocked(unsentRequest.fetchWithTimeout).mockResolvedValue(jsonResponse(410, {}));

    await expect(exchangeQrTransferCode('https://api.example.com', 'stale-code')).rejects.toThrow(
      /could not be exchanged/,
    );
  });

  it('throws AccessTokenError when the response has no access_token', async () => {
    vi.mocked(unsentRequest.fetchWithTimeout).mockResolvedValue(jsonResponse(200, {}));

    await expect(exchangeQrTransferCode('https://api.example.com', 'the-code')).rejects.toThrow(
      /did not include an access token/,
    );
  });
});

describe('URL helpers', () => {
  // Navigate within jsdom's own origin (rather than reassigning
  // `window.location` to a foreign origin) so `history.replaceState` doesn't
  // trip jsdom's cross-origin SecurityError guard.
  beforeEach(() => {
    window.history.pushState({}, '', '/index.html');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('buildQrLoginDeepLink encodes the code as a query param on the current shell URL', () => {
    const link = buildQrLoginDeepLink('the-code');
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe(`${window.location.origin}/index.html`);
    expect(url.searchParams.get(QR_LOGIN_QUERY_PARAM)).toBe('the-code');
  });

  it('readQrLoginCodeFromLocation reads the param, and returns null when absent', () => {
    window.history.pushState({}, '', `/index.html?${QR_LOGIN_QUERY_PARAM}=scanned-code`);
    expect(readQrLoginCodeFromLocation()).toBe('scanned-code');

    window.history.pushState({}, '', '/index.html');
    expect(readQrLoginCodeFromLocation()).toBeNull();
  });

  it('clearQrLoginCodeFromLocation strips the param without adding a history entry', () => {
    window.history.pushState({}, '', `/index.html?${QR_LOGIN_QUERY_PARAM}=scanned-code&other=1`);
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    clearQrLoginCodeFromLocation();

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(window.location.search).not.toContain(QR_LOGIN_QUERY_PARAM);
    expect(window.location.search).toContain('other=1');

    replaceStateSpy.mockRestore();
  });
});
