import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/backends/local-fs/directoryHandleStore', () => ({
  saveDirectoryHandle: vi.fn(),
  loadDirectoryHandle: vi.fn(),
  clearDirectoryHandle: vi.fn(),
}));

import LocalFsBackend, { isLocalFsSupported } from '@/backends/local-fs/implementation';
import * as directoryHandleStore from '@/backends/local-fs/directoryHandleStore';
import { buildFakeTree, FakeDirectoryHandle } from './fakeFileSystem';

import type { CmsConfig } from '@/lib/util/index';


function makeConfig(overrides: Record<string, unknown> = {}): CmsConfig {
  return {
    backend: { name: 'local-fs' },
    collections: [],
    ...overrides,
  } as unknown as CmsConfig;
}

describe('isLocalFsSupported', () => {
  test('is false when showDirectoryPicker is missing', () => {
    expect(isLocalFsSupported({} as Window)).toBe(false);
  });

  test('is true when showDirectoryPicker is a function', () => {
    expect(isLocalFsSupported({ showDirectoryPicker: () => {} } as unknown as Window)).toBe(true);
  });
});

describe('LocalFsBackend', () => {
  const originalPicker = window.showDirectoryPicker;

  beforeEach(() => {
    window.showDirectoryPicker = vi.fn();
    vi.mocked(directoryHandleStore.saveDirectoryHandle).mockReset();
    vi.mocked(directoryHandleStore.loadDirectoryHandle).mockReset();
    vi.mocked(directoryHandleStore.clearDirectoryHandle).mockReset();
  });

  afterEach(() => {
    window.showDirectoryPicker = originalPicker;
  });

  test('constructor throws a ConfigurationError when the API is unsupported', () => {
    window.showDirectoryPicker = undefined;

    expect(() => new LocalFsBackend(makeConfig())).toThrow(/File System Access API/);
  });

  test('authenticate() persists the picked directory handle after permission is granted', async () => {
    const root = buildFakeTree({});
    root.permissionState = 'granted';
    vi.mocked(window.showDirectoryPicker!).mockResolvedValue(
      root as unknown as FileSystemDirectoryHandle,
    );

    const backend = new LocalFsBackend(makeConfig());
    await backend.authenticate();

    expect(directoryHandleStore.saveDirectoryHandle).toHaveBeenCalledWith(root);
    expect((await backend.status()).auth.status).toBe(true);
  });

  test('authenticate() throws when permission is denied', async () => {
    const root = buildFakeTree({});
    root.permissionState = 'denied';
    vi.mocked(window.showDirectoryPicker!).mockResolvedValue(
      root as unknown as FileSystemDirectoryHandle,
    );

    const backend = new LocalFsBackend(makeConfig());

    await expect(backend.authenticate()).rejects.toThrow(/not granted/);
    expect(directoryHandleStore.saveDirectoryHandle).not.toHaveBeenCalled();
  });

  test('restoreUser() reconnects a previously granted handle', async () => {
    const root = buildFakeTree({});
    root.permissionState = 'granted';
    vi.mocked(directoryHandleStore.loadDirectoryHandle).mockResolvedValue(
      root as unknown as FileSystemDirectoryHandle,
    );

    const backend = new LocalFsBackend(makeConfig());
    await backend.restoreUser();

    expect((await backend.status()).auth.status).toBe(true);
  });

  test('restoreUser() rejects when no handle was ever persisted', async () => {
    vi.mocked(directoryHandleStore.loadDirectoryHandle).mockResolvedValue(null);

    const backend = new LocalFsBackend(makeConfig());

    await expect(backend.restoreUser()).rejects.toThrow(/No local folder/);
  });

  test('restoreUser() rejects when the persisted handle is no longer granted', async () => {
    const root = buildFakeTree({});
    root.permissionState = 'denied';
    vi.mocked(directoryHandleStore.loadDirectoryHandle).mockResolvedValue(
      root as unknown as FileSystemDirectoryHandle,
    );

    const backend = new LocalFsBackend(makeConfig());

    await expect(backend.restoreUser()).rejects.toThrow(/not \(re-\)granted/);
  });

  async function authenticatedBackend(tree: Record<string, string> = {}) {
    const root = buildFakeTree(tree);
    root.permissionState = 'granted';
    vi.mocked(window.showDirectoryPicker!).mockResolvedValue(
      root as unknown as FileSystemDirectoryHandle,
    );
    const backend = new LocalFsBackend(makeConfig());
    await backend.authenticate();
    return { backend, root };
  }

  test('entriesByFolder / getEntry read file contents back', async () => {
    const { backend } = await authenticatedBackend({
      'content/posts/one.md': '# One',
      'content/posts/two.md': '# Two',
    });

    const entries = await backend.entriesByFolder('content/posts', 'md', 5);

    expect(entries.map(e => e.data).sort()).toEqual(['# One', '# Two']);
    expect(await backend.getEntry('content/posts/one.md')).toEqual({
      file: { path: 'content/posts/one.md', id: 'content/posts/one.md' },
      data: '# One',
    });
  });

  test('persistEntry writes data files and assets', async () => {
    const { backend, root } = await authenticatedBackend();

    await backend.persistEntry(
      {
        dataFiles: [{ path: 'content/posts/new.md', slug: 'new', raw: '# New' }],
        assets: [],
      },
      {} as never,
    );

    expect(await backend.getEntry('content/posts/new.md')).toMatchObject({ data: '# New' });
    expect(root.children.has('content')).toBe(true);
  });

  test('deleteFiles removes entries', async () => {
    const { backend } = await authenticatedBackend({ 'content/posts/one.md': '# One' });

    await backend.deleteFiles(['content/posts/one.md'], 'remove');

    expect(await backend.entriesByFolder('content/posts', 'md', 5)).toEqual([]);
  });

  test('getMedia / getMediaFile / persistMedia round-trip a media asset', async () => {
    const { backend } = await authenticatedBackend();

    await backend.persistMedia(
      {
        path: 'static/images/pic.png',
        fileObj: new File(['binary'], 'pic.png'),
        toBase64: async () => btoa('binary'),
      },
      {} as never,
    );

    const files = await backend.getMedia('static/images');
    expect(files.map(f => f.path)).toEqual(['static/images/pic.png']);

    const single = await backend.getMediaFile('static/images/pic.png');
    expect(single.name).toBe('pic.png');
  });

  test('editorial workflow methods reject: this backend has no place to stage unpublished drafts', async () => {
    const { backend } = await authenticatedBackend();

    await expect(backend.unpublishedEntry({})).rejects.toThrow();
    await expect(
      backend.updateUnpublishedEntryStatus('posts', 'slug', 'draft'),
    ).rejects.toThrow();
  });

  test('calling backend methods before authentication throws', async () => {
    window.showDirectoryPicker = vi.fn();
    const backend = new LocalFsBackend(makeConfig());

    await expect(backend.getEntry('content/posts/one.md')).rejects.toThrow(/not authenticated/);
  });
});
