/**
 * Tests for the laika backend's advisory entry-locking methods (ADR-007).
 *
 * These exercise the degradation contract, which is the part that is easy to
 * get subtly wrong: a 423 must reject so the editor raises the conflict banner,
 * while an unsupported backend or a dead network must resolve `null`/void so
 * locking silently degrades instead of blocking the edit or crying conflict.
 *
 * `@/lib/util`, `@/lib/auth` and `@/ui/default` are mocked for the same reason
 * as in laika-backend.spec.ts: they load the full UI graph and touch the DOM at
 * module scope.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { API_ERROR, ACCESS_TOKEN_ERROR } = vi.hoisted(() => ({
  API_ERROR: 'API_ERROR',
  ACCESS_TOKEN_ERROR: 'ACCESS_TOKEN_ERROR',
}));

vi.mock('@/lib/util/index', () => {
  class APIError extends Error {
    name = API_ERROR;
    status: number | undefined;
    api: string | undefined;
    constructor(message: string, status?: number, api?: string) {
      super(message);
      this.status = status;
      this.api = api;
    }
  }
  class AccessTokenError extends Error {
    name = ACCESS_TOKEN_ERROR;
  }
  return {
    APIError,
    AccessTokenError,
    Cursor: class {},
    CURSOR_COMPATIBILITY_SYMBOL: Symbol('cursor'),
    unsentRequest: {},
  };
});

vi.mock('@/lib/auth/index', () => ({}));
vi.mock('@/ui/default/index', () => ({}));

import createLaikaBackend from '@/backends/laika/laika-backend.js';

const PATH = 'posts/hello';
const OWNER = { id: 'alice@example.com', name: 'Alice' };
const LOCK_URL = `https://api.example.com/locks/${encodeURIComponent(PATH)}`;

function makeConfig() {
  return {
    media_folder: 'assets/uploads',
    backend: { name: 'laika', base_url: 'https://api.example.com', api_root: '' },
    collections: [],
  } as any;
}

function makeBackend() {
  const LaikaBackend = createLaikaBackend();
  const backend = new LaikaBackend(makeConfig()) as any;
  backend.tokenPromise = () => Promise.resolve('fake-token');
  return backend;
}

const lockBody = (over: Record<string, unknown> = {}) => ({
  data: {
    key: PATH,
    owner: OWNER,
    acquiredAt: '2026-08-10T10:00:00.000Z',
    expiresAt: '2026-08-10T10:05:00.000Z',
    ...over,
  },
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('laika backend entry locking', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let backend: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    backend = makeBackend();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('getEntryLock', () => {
    it('maps the wire shape onto the editor lock shape', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, lockBody({ token: 'should-be-ignored' })));

      const lock = await backend.getEntryLock(PATH);

      expect(lock).toEqual({
        path: PATH,
        owner: OWNER,
        acquiredAt: '2026-08-10T10:00:00.000Z',
        expiresAt: '2026-08-10T10:05:00.000Z',
      });
      expect(fetchMock).toHaveBeenCalledWith(LOCK_URL, expect.objectContaining({ method: 'GET' }));
    });

    it('returns null for an unlocked entry', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { data: null }));
      expect(await backend.getEntryLock(PATH)).toBeNull();
    });

    it('returns null (not a throw) when the backend cannot lock', async () => {
      fetchMock.mockResolvedValue(jsonResponse(501, { errors: [{ status: '501' }] }));
      expect(await backend.getEntryLock(PATH)).toBeNull();
    });

    it('returns null when the network is down', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));
      expect(await backend.getEntryLock(PATH)).toBeNull();
    });
  });

  describe('acquireEntryLock', () => {
    it('sends a bearer token and returns the lock', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, lockBody({ token: 'tok-1' })));

      const lock = await backend.acquireEntryLock(PATH, OWNER);

      expect(lock.path).toBe(PATH);
      expect(fetchMock).toHaveBeenCalledWith(
        LOCK_URL,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer fake-token' }),
        }),
      );
    });

    it('never sends an owner: the server derives it from the principal', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, lockBody({ token: 'tok-1' })));

      await backend.acquireEntryLock(PATH, OWNER);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).not.toHaveProperty('owner');
    });

    it("forwards force so a user can override someone else's lock", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, lockBody({ token: 'tok-1' })));

      await backend.acquireEntryLock(PATH, OWNER, { force: true });

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ force: true });
    });

    it('THROWS on 423 so the editor raises the conflict banner', async () => {
      fetchMock.mockResolvedValue(jsonResponse(423, { data: null, errors: [{ status: '423' }] }));

      await expect(backend.acquireEntryLock(PATH, OWNER)).rejects.toMatchObject({
        name: API_ERROR,
        status: 423,
      });
    });

    it('resolves null on 501 so locking degrades to unsupported', async () => {
      fetchMock.mockResolvedValue(jsonResponse(501, { errors: [{ status: '501' }] }));
      expect(await backend.acquireEntryLock(PATH, OWNER)).toBeNull();
    });

    it('resolves null when the request cannot be made at all', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));
      expect(await backend.acquireEntryLock(PATH, OWNER)).toBeNull();
    });
  });

  describe('refreshEntryLock', () => {
    it('refreshes with the token held from the acquire', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, lockBody({ token: 'tok-1' })));
      await backend.acquireEntryLock(PATH, OWNER);

      fetchMock.mockResolvedValueOnce(jsonResponse(200, lockBody({ token: 'tok-1' })));
      await backend.refreshEntryLock(PATH, OWNER);

      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe(`${LOCK_URL}/refresh`);
      expect(JSON.parse(init.body)).toEqual({ token: 'tok-1' });
    });

    it('re-acquires when this session holds no token (e.g. after a reload)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, lockBody({ token: 'tok-9' })));

      await backend.refreshEntryLock(PATH, OWNER);

      // Falls back to the plain acquire endpoint, not /refresh.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(LOCK_URL);
    });

    it('throws on 423 and forgets the now-invalid token', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, lockBody({ token: 'tok-1' })));
      await backend.acquireEntryLock(PATH, OWNER);

      fetchMock.mockResolvedValueOnce(jsonResponse(423, { data: null }));
      await expect(backend.refreshEntryLock(PATH, OWNER)).rejects.toMatchObject({ status: 423 });

      // The stale token is dropped, so the next refresh re-acquires rather than
      // replaying a token the server already rejected.
      fetchMock.mockResolvedValueOnce(jsonResponse(200, lockBody({ token: 'tok-2' })));
      await backend.refreshEntryLock(PATH, OWNER);
      expect(fetchMock.mock.calls[2][0]).toBe(LOCK_URL);
    });
  });

  describe('releaseEntryLock', () => {
    it('releases with the held token', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, lockBody({ token: 'tok-1' })));
      await backend.acquireEntryLock(PATH, OWNER);

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { meta: { released: true } }));
      await backend.releaseEntryLock(PATH, OWNER);

      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe(LOCK_URL);
      expect(init.method).toBe('DELETE');
      expect(JSON.parse(init.body)).toEqual({ token: 'tok-1' });
    });

    it('is a no-op when this session holds no token', async () => {
      await backend.releaseEntryLock(PATH, OWNER);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('swallows a failed release, letting the TTL reclaim the lock', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, lockBody({ token: 'tok-1' })));
      await backend.acquireEntryLock(PATH, OWNER);

      fetchMock.mockRejectedValueOnce(new Error('offline'));
      await expect(backend.releaseEntryLock(PATH, OWNER)).resolves.toBeUndefined();
    });

    it('does not replay a released token on a later release', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, lockBody({ token: 'tok-1' })));
      await backend.acquireEntryLock(PATH, OWNER);
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { meta: { released: true } }));
      await backend.releaseEntryLock(PATH, OWNER);

      await backend.releaseEntryLock(PATH, OWNER);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('logout', () => {
    it('drops held lock tokens, so a new session cannot reuse them', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, lockBody({ token: 'tok-1' })));
      await backend.acquireEntryLock(PATH, OWNER);

      await backend.logout();
      backend.tokenPromise = () => Promise.resolve('fake-token');

      await backend.releaseEntryLock(PATH, OWNER);
      expect(fetchMock).toHaveBeenCalledTimes(1); // only the original acquire
    });
  });
});
