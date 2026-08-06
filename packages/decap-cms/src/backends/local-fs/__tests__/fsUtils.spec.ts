import { describe, expect, test } from 'vitest';

import {
  deleteEntry,
  getDirectoryHandle,
  getFileHandle,
  listFiles,
  readFileAsString,
  requestPermission,
  writeFile,
} from '@/backends/local-fs/fsUtils';
import { buildFakeTree } from './fakeFileSystem';

import type { FakeDirectoryHandle } from './fakeFileSystem';

function asHandle(dir: FakeDirectoryHandle) {
  return dir as unknown as FileSystemDirectoryHandle;
}

describe('local-fs fsUtils', () => {
  test('listFiles finds files nested under a folder, filtered by extension', async () => {
    const root = buildFakeTree({
      'content/posts/one.md': '# one',
      'content/posts/two.md': '# two',
      'content/posts/notes.txt': 'not markdown',
      'content/pages/about.md': '# about',
    });

    const paths = await listFiles(asHandle(root), 'content/posts', 'md', 5);

    expect(paths.sort()).toEqual(['content/posts/one.md', 'content/posts/two.md']);
  });

  test('listFiles returns an empty array for a missing folder', async () => {
    const root = buildFakeTree({});

    const paths = await listFiles(asHandle(root), 'does/not/exist', 'md', 5);

    expect(paths).toEqual([]);
  });

  test('listFiles respects depth', async () => {
    const root = buildFakeTree({
      'a/shallow.md': '1',
      'a/b/deep.md': '2',
    });

    expect(await listFiles(asHandle(root), 'a', 'md', 1)).toEqual(['a/shallow.md']);
    expect((await listFiles(asHandle(root), 'a', 'md', 2)).sort()).toEqual([
      'a/b/deep.md',
      'a/shallow.md',
    ]);
  });

  test('readFileAsString reads back written content', async () => {
    const root = buildFakeTree({});

    await writeFile(asHandle(root), 'content/posts/new.md', '# hello');

    expect(await readFileAsString(asHandle(root), 'content/posts/new.md')).toBe('# hello');
  });

  test('writeFile creates intermediate directories', async () => {
    const root = buildFakeTree({});

    await writeFile(asHandle(root), 'a/b/c/deep.md', 'nested');

    const dir = await getDirectoryHandle(asHandle(root), 'a/b/c');
    const fileHandle = await getFileHandle(dir, 'deep.md');
    expect(await (await fileHandle.getFile()).text()).toBe('nested');
  });

  test('deleteEntry removes a file', async () => {
    const root = buildFakeTree({ 'content/posts/one.md': 'x' });

    await deleteEntry(asHandle(root), 'content/posts/one.md');

    expect(await listFiles(asHandle(root), 'content/posts', 'md', 5)).toEqual([]);
  });

  test('deleteEntry on a missing path does not throw', async () => {
    const root = buildFakeTree({});

    await expect(deleteEntry(asHandle(root), 'nope.md')).resolves.toBeUndefined();
  });

  test('requestPermission short-circuits when already granted', async () => {
    const root = buildFakeTree({});
    root.permissionState = 'granted';

    await expect(requestPermission(asHandle(root))).resolves.toBe(true);
  });

  test('requestPermission reflects a denied grant', async () => {
    const root = buildFakeTree({});
    root.permissionState = 'denied';

    await expect(requestPermission(asHandle(root))).resolves.toBe(false);
  });
});
