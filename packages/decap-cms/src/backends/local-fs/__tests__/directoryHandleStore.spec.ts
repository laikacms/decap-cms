import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test } from 'vitest';

import {
  clearDirectoryHandle,
  loadDirectoryHandle,
  saveDirectoryHandle,
} from '@/backends/local-fs/directoryHandleStore';

import { buildFakeTree } from './fakeFileSystem';

function asHandle<T>(value: T) {
  return value as unknown as FileSystemDirectoryHandle;
}

describe('local-fs directoryHandleStore', () => {
  afterEach(async () => {
    await clearDirectoryHandle();
  });

  test('loadDirectoryHandle returns null when nothing was ever saved', async () => {
    await expect(loadDirectoryHandle()).resolves.toBeNull();
  });

  test('saveDirectoryHandle persists a handle that loadDirectoryHandle then returns', async () => {
    const handle = asHandle(buildFakeTree({ 'content/one.md': '# one' }));

    await saveDirectoryHandle(handle);

    expect(await loadDirectoryHandle()).toEqual(handle);
  });

  test('saveDirectoryHandle overwrites a previously persisted handle', async () => {
    const first = asHandle(buildFakeTree({}));
    const second = asHandle(buildFakeTree({}));

    await saveDirectoryHandle(first);
    await saveDirectoryHandle(second);

    expect(await loadDirectoryHandle()).toEqual(second);
  });

  test('clearDirectoryHandle removes the persisted handle', async () => {
    const handle = asHandle(buildFakeTree({}));
    await saveDirectoryHandle(handle);

    await clearDirectoryHandle();

    expect(await loadDirectoryHandle()).toBeNull();
  });
});
