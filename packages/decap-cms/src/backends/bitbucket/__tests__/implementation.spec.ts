import { describe, expect, test, vi } from 'vitest';

import BitbucketBackend from '@/backends/bitbucket/implementation';
import { Cursor, CURSOR_COMPATIBILITY_SYMBOL } from '@/lib/util/index';

import type { CmsBackendInitConfig } from '@/lib/util/index';

function makeConfig(backendOverrides: Record<string, unknown> = {}): CmsBackendInitConfig {
  return {
    backend: {
      name: 'bitbucket',
      repo: 'owner/repo',
      ...backendOverrides,
    },
  } as unknown as CmsBackendInitConfig;
}

describe('bitbucket backend implementation config keys', () => {
  test('defaults api_root to the public Bitbucket API root when unset', () => {
    const backend = new BitbucketBackend(makeConfig());

    expect(backend.apiRoot).toBe('https://api.bitbucket.org/2.0');
  });

  test('reads api_root from backend config when set', () => {
    const backend = new BitbucketBackend(makeConfig({ api_root: 'https://bitbucket.example.com/2.0' }));

    expect(backend.apiRoot).toBe('https://bitbucket.example.com/2.0');
  });

  test('defaults auth_type to an empty string when unset', () => {
    const backend = new BitbucketBackend(makeConfig());

    expect(backend.authType).toBe('');
  });

  test('reads auth_type from backend config when set', () => {
    const backend = new BitbucketBackend(makeConfig({ auth_type: 'implicit' }));

    expect(backend.authType).toBe('implicit');
  });
});

/**
 * Stubs the API surface the read path uses, so the seam shape is asserted
 * without going near Bitbucket HTTP.
 */
function backendWithApi(api: Record<string, unknown>) {
  const backend = new BitbucketBackend(makeConfig());
  backend.api = {
    defaultBranchCommitSha: vi.fn(() => Promise.resolve('head-sha')),
    readFileMetadata: vi.fn(() => Promise.resolve({ author: 'Ada Lovelace', updatedOn: '2026-01-02T03:04:05Z' })),
    readFile: vi.fn((_path: string, id: string | null) => Promise.resolve(`content of ${id}`)),
    ...api,
  } as never;
  return backend;
}

describe('bitbucket backend entry reads', () => {
  test('returns folder entries as raw content with a structured author', async () => {
    const cursor = Cursor.create({ actions: ['next'], meta: { page: 1 } });
    const backend = backendWithApi({
      listFiles: vi.fn(() =>
        Promise.resolve({
          entries: [
            { id: 'sha-a', path: 'posts/a.md' },
            { id: 'sha-img', path: 'posts/cover.png' },
          ],
          cursor,
        })
      ),
    });

    const entries = await backend.entriesByFolder('posts', 'md', 1);

    // Spread drops the cursor-compatibility symbol the array also carries.
    expect([...entries]).toEqual([
      {
        file: {
          path: 'posts/a.md',
          id: 'sha-a',
          author: { name: 'Ada Lovelace' },
          updatedOn: '2026-01-02T03:04:05Z',
        },
        content: { kind: 'raw', raw: 'content of sha-a' },
      },
    ]);
    expect(entries[CURSOR_COMPATIBILITY_SYMBOL].meta?.['extension']).toBe('md');
  });

  test('reads folder entries at the default branch head', async () => {
    const readFile = vi.fn((_path: string, id: string | null) => Promise.resolve(`content of ${id}`));
    const backend = backendWithApi({
      readFile,
      listFiles: vi.fn(() =>
        Promise.resolve({
          entries: [{ id: 'sha-a', path: 'posts/a.md' }],
          cursor: Cursor.create({ actions: [] }),
        })
      ),
    });

    await backend.entriesByFolder('posts', 'md', 1);

    expect(readFile).toHaveBeenCalledWith('posts/a.md', 'sha-a', { head: 'head-sha' });
  });

  test('returns named files as raw content', async () => {
    const backend = backendWithApi({});

    await expect(backend.entriesByFiles([{ path: 'pages/about.md', id: 'sha-about' }])).resolves
      .toEqual([
        {
          file: {
            path: 'pages/about.md',
            id: 'sha-about',
            author: { name: 'Ada Lovelace' },
            updatedOn: '2026-01-02T03:04:05Z',
          },
          content: { kind: 'raw', raw: 'content of sha-about' },
        },
      ]);
  });

  test('returns a single entry as raw content, reporting no revision id', async () => {
    const backend = backendWithApi({
      readFile: vi.fn(() => Promise.resolve('# Hello')),
    });

    await expect(backend.getEntry('posts/a.md')).resolves.toEqual({
      file: { path: 'posts/a.md', id: null },
      content: { kind: 'raw', raw: '# Hello' },
    });
  });

  test('traverseCursor returns the next page as raw entries, keeping the extension filter', async () => {
    const backend = backendWithApi({
      traverseCursor: vi.fn(() =>
        Promise.resolve({
          entries: [
            { id: 'sha-b', path: 'posts/b.md' },
            { id: 'sha-img', path: 'posts/cover.png' },
          ],
          cursor: Cursor.create({ actions: ['prev'], meta: { page: 2 } }),
        })
      ),
    });

    const { entries, cursor } = await backend.traverseCursor(
      Cursor.create({ actions: ['next'], meta: { page: 1, extension: 'md' } }),
      'next',
    );

    expect(entries).toEqual([
      {
        file: {
          path: 'posts/b.md',
          id: 'sha-b',
          author: { name: 'Ada Lovelace' },
          updatedOn: '2026-01-02T03:04:05Z',
        },
        content: { kind: 'raw', raw: 'content of sha-b' },
      },
    ]);
    expect(cursor.meta?.['extension']).toBe('md');
  });
});
