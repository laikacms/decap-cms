import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitLfsClient } from '@/lib/util/git-lfs-client';

import type * as UnsentRequestModule from '@/lib/util/unsentRequest';
import type { PointerFile } from '@/lib/util/git-lfs';

const mockFetchWithTimeout = vi.fn();

vi.mock('@/lib/util/unsentRequest', async importOriginal => {
  const actual = await importOriginal<typeof UnsentRequestModule>();
  return {
    ...actual,
    default: {
      ...actual.default,
      fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args),
    },
  };
});

const makeAuthorizedRequest = vi.fn();

const ROOT_URL = 'https://github.com/owner/repo.git/info/lfs';

function makeClient(patterns: string[], enabled = true) {
  return new GitLfsClient(enabled, ROOT_URL, patterns, makeAuthorizedRequest);
}

function jsonResponse(body: unknown) {
  return { json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GitLfsClient enabled flag', () => {
  it('constructing with enabled: false does not itself make any request', () => {
    makeClient([], false);

    expect(makeAuthorizedRequest).not.toHaveBeenCalled();
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it('exposes the enabled flag so callers can short-circuit before invoking the client', () => {
    expect(makeClient([], false).enabled).toBe(false);
    expect(makeClient([], true).enabled).toBe(true);
  });
});

describe('GitLfsClient matchPath', () => {
  it('matches an exact filename pattern', () => {
    const client = makeClient(['assets/large-file.bin']);

    expect(client.matchPath('assets/large-file.bin')).toBe(true);
  });

  it('matches a **/*.ext glob pattern', () => {
    const client = makeClient(['**/*.psd']);

    expect(client.matchPath('assets/images/nested/design.psd')).toBe(true);
  });

  it('returns false when no pattern matches', () => {
    const client = makeClient(['**/*.psd', 'assets/large-file.bin']);

    expect(client.matchPath('assets/images/photo.png')).toBe(false);
  });

  it('matches a bare filename pattern against a nested path via matchBase', () => {
    const client = makeClient(['*.bin']);

    expect(client.matchPath('assets/deeply/nested/large-file.bin')).toBe(true);
  });

  it('returns false when the pattern list is empty', () => {
    expect(makeClient([]).matchPath('images/foo.png')).toBe(false);
  });
});

describe('GitLfsClient uploadResource', () => {
  const pointer: PointerFile = { sha: 'abc123', size: 42 };
  const resource = {} as Blob;

  it('uploads and then verifies an object whose batch response carries both actions', async () => {
    const client = makeClient(['**']);
    makeAuthorizedRequest
      .mockResolvedValueOnce(
        jsonResponse({
          objects: [
            {
              oid: 'abc123',
              size: 42,
              actions: {
                upload: { href: 'https://example.com/upload' },
                verify: { href: 'https://example.com/verify' },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(undefined);

    const sha = await client.uploadResource(pointer, resource);

    expect(sha).toBe('abc123');
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://example.com/upload',
      expect.objectContaining({ method: 'PUT', body: resource }),
    );
    expect(makeAuthorizedRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: 'https://example.com/verify',
        method: 'POST',
        body: JSON.stringify({ oid: 'abc123', size: 42 }),
      }),
    );
  });

  it('skips an object whose batch response carries an error, without uploading it', async () => {
    const client = makeClient(['**']);
    makeAuthorizedRequest.mockResolvedValueOnce(
      jsonResponse({
        objects: [{ oid: 'abc123', size: 42, error: { code: 404, message: 'not found' } }],
      }),
    );

    const sha = await client.uploadResource(pointer, resource);

    expect(sha).toBe('abc123');
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
    expect(makeAuthorizedRequest).toHaveBeenCalledTimes(1);
  });

  it('posts to the batch endpoint with the upload operation and the oid-keyed object', async () => {
    const client = makeClient(['**']);
    makeAuthorizedRequest.mockResolvedValueOnce(jsonResponse({ objects: [] }));

    await client.uploadResource(pointer, resource);

    expect(makeAuthorizedRequest).toHaveBeenNthCalledWith(1, {
      url: `${ROOT_URL}/objects/batch`,
      method: 'POST',
      headers: {
        Accept: 'application/vnd.git-lfs+json',
        ['Content-Type']: 'application/vnd.git-lfs+json',
      },
      body: JSON.stringify({
        operation: 'upload',
        transfers: ['basic'],
        objects: [{ size: 42, oid: 'abc123' }],
      }),
    });
  });
});

describe('GitLfsClient downloadResource', () => {
  const pointer: PointerFile = { sha: 'def456', size: 100 };

  it('resolves the object bytes from the batch response download action', async () => {
    const client = makeClient(['**']);
    const blob = new Blob(['real binary content']);
    makeAuthorizedRequest.mockResolvedValueOnce(
      jsonResponse({
        objects: [
          {
            oid: 'def456',
            size: 100,
            actions: {
              download: {
                href: 'https://media.githubusercontent.com/lfs/def456',
                header: { Authorization: 'RemoteAuth token' },
              },
            },
          },
        ],
      }),
    );
    mockFetchWithTimeout.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(blob) });

    const result = await client.downloadResource(pointer);

    expect(result).toBe(blob);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://media.githubusercontent.com/lfs/def456',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'RemoteAuth token' },
      }),
    );
  });

  it('posts a download batch operation with the pointer oid and size', async () => {
    const client = makeClient(['**']);
    makeAuthorizedRequest.mockResolvedValueOnce(jsonResponse({ objects: [] }));

    await expect(client.downloadResource(pointer)).rejects.toThrow(
      "Unable to resolve LFS download action for object 'def456'",
    );
    expect(makeAuthorizedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${ROOT_URL}/objects/batch`,
        body: JSON.stringify({
          operation: 'download',
          transfers: ['basic'],
          objects: [{ size: 100, oid: 'def456' }],
        }),
      }),
    );
  });

  it('throws when the batch response reports an error instead of a download action', async () => {
    const client = makeClient(['**']);
    makeAuthorizedRequest.mockResolvedValueOnce(
      jsonResponse({
        objects: [{ oid: 'def456', size: 100, error: { code: 404, message: 'not found' } }],
      }),
    );

    await expect(client.downloadResource(pointer)).rejects.toThrow(
      "Unable to resolve LFS download action for object 'def456'",
    );
  });

  it('throws when the underlying download request fails', async () => {
    const client = makeClient(['**']);
    makeAuthorizedRequest.mockResolvedValueOnce(
      jsonResponse({
        objects: [
          {
            oid: 'def456',
            size: 100,
            actions: { download: { href: 'https://media.githubusercontent.com/lfs/def456' } },
          },
        ],
      }),
    );
    mockFetchWithTimeout.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' });

    await expect(client.downloadResource(pointer)).rejects.toThrow(
      'Failed to download LFS object: 500 Error',
    );
  });
});
