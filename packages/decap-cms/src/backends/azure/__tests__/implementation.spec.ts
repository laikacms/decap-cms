import { describe, expect, it, vi } from 'vitest';

import AzureBackend from '@/backends/azure/implementation';

import type { CmsConfig } from '@/lib/util/index';

function makeConfig(overrides: Record<string, unknown> = {}): CmsConfig {
  return {
    backend: {
      name: 'azure',
      repo: 'org/project/repo',
      ...overrides,
    },
    media_folder: 'static/media',
  } as unknown as CmsConfig;
}

/**
 * Stubs the API surface the read path uses, so the seam shape is asserted
 * without going near Azure DevOps HTTP.
 */
function backendWithApi(api: Record<string, unknown>) {
  const backend = new AzureBackend(makeConfig());
  backend.api = api as never;
  return backend;
}

describe('azure backend entry reads', () => {
  it('returns folder entries as raw content with a structured author', async () => {
    const backend = backendWithApi({
      listFiles: vi.fn(() =>
        Promise.resolve([
          { id: 'sha-a', path: 'posts/a.md' },
          { id: 'sha-b', path: 'posts/b.md' },
          { id: 'sha-img', path: 'posts/cover.png' },
        ])
      ),
      readFile: vi.fn((_path: string, id: string) => Promise.resolve(`content of ${id}`)),
      readFileMetadata: vi.fn(() => Promise.resolve({ author: 'Ada Lovelace', updatedOn: '2026-01-02T03:04:05Z' })),
    });

    await expect(backend.entriesByFolder('posts', 'md', 1)).resolves.toEqual([
      {
        file: {
          path: 'posts/a.md',
          id: 'sha-a',
          author: { name: 'Ada Lovelace' },
          updatedOn: '2026-01-02T03:04:05Z',
        },
        content: { kind: 'raw', raw: 'content of sha-a' },
      },
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
  });

  it('filters the listing down to the collection extension', async () => {
    const readFile = vi.fn((_path: string, id: string) => Promise.resolve(`content of ${id}`));
    const backend = backendWithApi({
      listFiles: vi.fn(() =>
        Promise.resolve([
          { id: 'sha-a', path: 'posts/a.md' },
          { id: 'sha-img', path: 'posts/cover.png' },
        ])
      ),
      readFile,
      readFileMetadata: vi.fn(() => Promise.resolve({})),
    });

    const entries = await backend.entriesByFolder('posts', 'md', 1);

    expect(entries.map(entry => entry.file.path)).toEqual(['posts/a.md']);
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it('returns named files as raw content', async () => {
    const backend = backendWithApi({
      readFile: vi.fn(() => Promise.resolve('---\ntitle: About\n---\n')),
      readFileMetadata: vi.fn(() => Promise.resolve({ author: '', updatedOn: '' })),
    });

    const entries = await backend.entriesByFiles([{ path: 'pages/about.md', id: 'sha-about' }]);

    expect(entries).toEqual([
      {
        file: { path: 'pages/about.md', id: 'sha-about', updatedOn: '' },
        content: { kind: 'raw', raw: '---\ntitle: About\n---\n' },
      },
    ]);
  });

  it('returns a single entry as raw content, with no revision id to report', async () => {
    const readFile = vi.fn(() => Promise.resolve('# Hello'));
    const backend = backendWithApi({ readFile });

    await expect(backend.getEntry('posts/a.md')).resolves.toEqual({
      file: { path: 'posts/a.md' },
      content: { kind: 'raw', raw: '# Hello' },
    });

    expect(readFile).toHaveBeenCalledWith('posts/a.md');
  });
});
