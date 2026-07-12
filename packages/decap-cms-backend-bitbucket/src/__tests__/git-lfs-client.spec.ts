import { GitLfsClient } from '../git-lfs-client';

import type { PointerFile } from 'decap-cms-lib-util';

const mockFetchWithTimeout = jest.fn();

jest.mock('decap-cms-lib-util', () => ({
  ...jest.requireActual('decap-cms-lib-util'),
  unsentRequest: {
    fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args),
  },
}));

const makeAuthorizedRequest = jest.fn();

function makeClient(patterns: string[], enabled = true) {
  return new GitLfsClient(enabled, 'https://example.com/lfs', patterns, makeAuthorizedRequest);
}

function jsonResponse(body: unknown) {
  return { json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GitLfsClient enabled flag', () => {
  it('constructing with enabled: false does not itself make any request', () => {
    makeClient([], false);
    expect(makeAuthorizedRequest).not.toHaveBeenCalled();
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it('exposes the enabled flag so callers can short-circuit before invoking the client', () => {
    const disabled = makeClient([], false);
    const enabled = makeClient([], true);
    expect(disabled.enabled).toBe(false);
    expect(enabled.enabled).toBe(true);
  });
});

describe('GitLfsClient.matchPath', () => {
  it('returns true when path matches a glob pattern', () => {
    const client = makeClient(['images/**']);
    expect(client.matchPath('images/photo.jpg')).toBe(true);
  });

  it('returns false when path does not match any pattern', () => {
    const client = makeClient(['images/**']);
    expect(client.matchPath('documents/report.pdf')).toBe(false);
  });

  it('matches a basename-only pattern against a nested path (matchBase: true)', () => {
    const client = makeClient(['*.png']);
    expect(client.matchPath('images/foo.png')).toBe(true);
  });

  it('returns false when patterns array is empty', () => {
    const client = makeClient([]);
    expect(client.matchPath('images/foo.png')).toBe(false);
  });

  it('returns true when path matches one of multiple patterns', () => {
    const client = makeClient(['*.jpg', '*.png', '*.gif']);
    expect(client.matchPath('assets/banner.gif')).toBe(true);
  });

  it('returns false when path does not match any of multiple patterns', () => {
    const client = makeClient(['*.jpg', '*.png']);
    expect(client.matchPath('assets/document.pdf')).toBe(false);
  });
});

describe('GitLfsClient.uploadResource', () => {
  const pointer: PointerFile = { sha: 'abc123', size: 42 };
  const resource = {} as Blob;

  it('uploads and verifies an object whose batch response carries actions.upload', async () => {
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
        objects: [
          {
            oid: 'abc123',
            size: 42,
            error: { code: 404, message: 'not found' },
          },
        ],
      }),
    );

    const sha = await client.uploadResource(pointer, resource);

    expect(sha).toBe('abc123');
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
    expect(makeAuthorizedRequest).toHaveBeenCalledTimes(1);
  });

  it('builds the batch request body from the pointer file objects', async () => {
    const client = makeClient(['**']);
    makeAuthorizedRequest.mockResolvedValueOnce(jsonResponse({ objects: [] }));

    await client.uploadResource(pointer, resource);

    expect(makeAuthorizedRequest).toHaveBeenNthCalledWith(1, {
      url: 'https://example.com/lfs/objects/batch',
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
