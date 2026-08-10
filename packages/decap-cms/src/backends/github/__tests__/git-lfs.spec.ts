import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitHubImplementation from '@/backends/github/implementation';
import { createPointerFile } from '@/lib/util/git-lfs';

import type { GitLfsClient } from '@/lib/util/git-lfs-client';

vi.spyOn(console, 'error').mockImplementation(() => {});

const LFS_GITATTRIBUTES = '*.psd filter=lfs diff=lfs merge=lfs -text\n';

function makeConfig(backend: Record<string, unknown> = {}) {
  return {
    backend: { repo: 'owner/repo', api_root: 'https://api.github.com', ...backend },
    media_folder: 'assets',
  };
}

/** A backend instance whose `.gitattributes` read is stubbed to `attributes`. */
function makeBackend(attributes: string | Error, backendConfig?: Record<string, unknown>) {
  const backend = new GitHubImplementation(makeConfig(backendConfig));
  backend.api = {
    readFile: vi.fn(() => attributes instanceof Error ? Promise.reject(attributes) : Promise.resolve(attributes)),
    persistFiles: vi.fn(() => Promise.resolve()),
  };
  return backend;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('github backend large-media URL', () => {
  it("defaults to the repo's github.com LFS endpoint", () => {
    expect(new GitHubImplementation(makeConfig()).largeMediaURL).toBe(
      'https://github.com/owner/repo.git/info/lfs',
    );
  });

  it('uses backend.large_media_url when set, for a self-hosted LFS server', () => {
    const backend = new GitHubImplementation(
      makeConfig({ large_media_url: 'https://lfs.example.com/info/lfs' }),
    );

    expect(backend.largeMediaURL).toBe('https://lfs.example.com/info/lfs');
  });
});

describe('github backend getLargeMediaClient', () => {
  it('enables the client from the lfs patterns in .gitattributes', async () => {
    const client = await makeBackend(LFS_GITATTRIBUTES).getLargeMediaClient();

    expect(client.enabled).toBe(true);
    expect(client.patterns).toEqual(['*.psd']);
    expect(client.matchPath('assets/design.psd')).toBe(true);
  });

  it('stays disabled when .gitattributes tracks nothing through lfs', async () => {
    const client = await makeBackend('*.txt text\n').getLargeMediaClient();

    expect(client.enabled).toBe(false);
    expect(client.patterns).toEqual([]);
  });

  it('stays disabled, and stays quiet, when the repo has no .gitattributes', async () => {
    const notFound = Object.assign(new Error('Not Found'), { status: 404 });

    const client = await makeBackend(notFound).getLargeMediaClient();

    expect(client.enabled).toBe(false);
    // A missing .gitattributes just means "this repo doesn't use LFS"; it is
    // not an error worth putting in the console.
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs, but still degrades to disabled, when the .gitattributes read fails for another reason', async () => {
    const serverError = Object.assign(new Error('Server Error'), { status: 500 });

    const client = await makeBackend(serverError).getLargeMediaClient();

    expect(client.enabled).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('reads .gitattributes once and reuses the client', async () => {
    const backend = makeBackend(LFS_GITATTRIBUTES);

    const [first, second] = await Promise.all([
      backend.getLargeMediaClient(),
      backend.getLargeMediaClient(),
    ]);

    expect(first).toBe(second);
    expect(backend.api.readFile).toHaveBeenCalledTimes(1);
  });
});

describe('github backend resolvePointerFile', () => {
  const pointerText = createPointerFile({ sha: 'abc123', size: 4096 });

  function makeClient(overrides: Partial<GitLfsClient> = {}) {
    return {
      enabled: true,
      matchPath: () => true,
      downloadResource: vi.fn(() => Promise.resolve(new Blob(['real bytes']))),
      ...overrides,
    } as unknown as GitLfsClient;
  }

  it('swaps a pointer file for the object bytes the batch API resolves', async () => {
    const backend = makeBackend(LFS_GITATTRIBUTES);
    const client = makeClient();

    const result = await backend.resolvePointerFile('assets/design.psd', new Blob([pointerText]), client);

    expect(await result.text()).toBe('real bytes');
    expect(client.downloadResource).toHaveBeenCalledWith({ sha: 'abc123', size: 4096 });
  });

  it('leaves the blob alone when the client is disabled', async () => {
    const backend = makeBackend(LFS_GITATTRIBUTES);
    const blob = new Blob([pointerText]);
    const client = makeClient({ enabled: false });

    expect(await backend.resolvePointerFile('assets/design.psd', blob, client)).toBe(blob);
    expect(client.downloadResource).not.toHaveBeenCalled();
  });

  it('leaves the blob alone when the path is not LFS tracked', async () => {
    const backend = makeBackend(LFS_GITATTRIBUTES);
    const blob = new Blob([pointerText]);
    const client = makeClient({ matchPath: () => false });

    expect(await backend.resolvePointerFile('assets/photo.png', blob, client)).toBe(blob);
    expect(client.downloadResource).not.toHaveBeenCalled();
  });

  it('leaves a blob too large to be a pointer file alone, without decoding it', async () => {
    const backend = makeBackend(LFS_GITATTRIBUTES);
    // A real 2KB+ image that merely lives under an LFS-tracked pattern.
    const blob = new Blob(['x'.repeat(2048)]);
    const client = makeClient();

    expect(await backend.resolvePointerFile('assets/design.psd', blob, client)).toBe(blob);
    expect(client.downloadResource).not.toHaveBeenCalled();
  });

  it('leaves a small non-pointer file alone', async () => {
    const backend = makeBackend(LFS_GITATTRIBUTES);
    const blob = new Blob(['just a small real file']);
    const client = makeClient();

    expect(await backend.resolvePointerFile('assets/design.psd', blob, client)).toBe(blob);
    expect(client.downloadResource).not.toHaveBeenCalled();
  });

  it('falls back to the pointer blob when the download fails, rather than breaking the entry', async () => {
    const backend = makeBackend(LFS_GITATTRIBUTES);
    const blob = new Blob([pointerText]);
    const client = makeClient({
      downloadResource: vi.fn(() => Promise.reject(new Error('batch endpoint down'))),
    });

    expect(await backend.resolvePointerFile('assets/design.psd', blob, client)).toBe(blob);
    expect(console.error).toHaveBeenCalled();
  });

  it('strips a leading slash before matching the path against the lfs patterns', async () => {
    const backend = makeBackend(LFS_GITATTRIBUTES);
    const matchPath = vi.fn(() => true);
    const client = makeClient({ matchPath });

    await backend.resolvePointerFile('/assets/design.psd', new Blob([pointerText]), client);

    expect(matchPath).toHaveBeenCalledWith('assets/design.psd');
  });
});
