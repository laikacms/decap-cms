import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

import { listRepoFiles, writeFile, deleteFile, move, getUpdateDate } from '../fs';

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dcms-fs-'));
}

async function rmTmpDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

describe('fs utils', () => {
  describe('listRepoFiles', () => {
    it('returns relative paths for matching files', async () => {
      const tmpDir = await makeTmpDir();
      try {
        await fs.writeFile(path.join(tmpDir, 'post.md'), '');
        await fs.writeFile(path.join(tmpDir, 'other.txt'), '');

        const files = await listRepoFiles(tmpDir, '', '.md', 1);
        expect(files).toContain('post.md');
        expect(files).not.toContain('other.txt');
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('lists files in nested subdirectories', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const subDir = path.join(tmpDir, 'content', 'posts');
        await fs.mkdir(subDir, { recursive: true });
        await fs.writeFile(path.join(subDir, 'hello.md'), '');

        const files = await listRepoFiles(tmpDir, 'content', '.md', 5);
        // paths are relative to repoPath
        expect(files.some(f => f.endsWith('hello.md'))).toBe(true);
        expect(files.every(f => !path.isAbsolute(f))).toBe(true);
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('respects depth limit — returns empty when depth is 0', async () => {
      const tmpDir = await makeTmpDir();
      try {
        await fs.writeFile(path.join(tmpDir, 'post.md'), '');

        const files = await listRepoFiles(tmpDir, '', '.md', 0);
        expect(files).toHaveLength(0);
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('does not descend beyond the specified depth', async () => {
      const tmpDir = await makeTmpDir();
      try {
        // depth 1 from folder means the folder itself is listed; nested subdirs are not
        const level1 = path.join(tmpDir, 'posts');
        const level2 = path.join(level1, 'nested');
        await fs.mkdir(level2, { recursive: true });
        await fs.writeFile(path.join(level1, 'shallow.md'), '');
        await fs.writeFile(path.join(level2, 'deep.md'), '');

        // depth=1 means only direct children of the folder are scanned
        const files = await listRepoFiles(tmpDir, 'posts', '.md', 1);
        expect(files.some(f => f.endsWith('shallow.md'))).toBe(true);
        expect(files.some(f => f.endsWith('deep.md'))).toBe(false);
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('returns empty array for non-existent folder', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const files = await listRepoFiles(tmpDir, 'does-not-exist', '.md', 5);
        expect(files).toHaveLength(0);
      } finally {
        await rmTmpDir(tmpDir);
      }
    });
  });

  describe('writeFile', () => {
    it('creates the file and any missing parent directories', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const target = path.join(tmpDir, 'a', 'b', 'c.txt');
        await writeFile(target, 'hello');
        const content = await fs.readFile(target, 'utf8');
        expect(content).toBe('hello');
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('overwrites an existing file', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const target = path.join(tmpDir, 'file.txt');
        await writeFile(target, 'first');
        await writeFile(target, 'second');
        const content = await fs.readFile(target, 'utf8');
        expect(content).toBe('second');
      } finally {
        await rmTmpDir(tmpDir);
      }
    });
  });

  describe('deleteFile', () => {
    it('removes an existing file', async () => {
      const tmpDir = await makeTmpDir();
      try {
        await fs.writeFile(path.join(tmpDir, 'to-delete.md'), '');
        await deleteFile(tmpDir, 'to-delete.md');
        await expect(fs.access(path.join(tmpDir, 'to-delete.md'))).rejects.toThrow();
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('does not throw for a missing file', async () => {
      const tmpDir = await makeTmpDir();
      try {
        await expect(deleteFile(tmpDir, 'ghost.md')).resolves.toBeUndefined();
      } finally {
        await rmTmpDir(tmpDir);
      }
    });
  });

  describe('move', () => {
    it('renames a single file when hasSubfolders is false', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const from = path.join(tmpDir, 'old.md');
        const to = path.join(tmpDir, 'new.md');
        await fs.writeFile(from, 'content');

        await move(from, to, false);

        await expect(fs.access(to)).resolves.toBeUndefined();
        await expect(fs.access(from)).rejects.toThrow();
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('moves sibling files when hasSubfolders is true (default)', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const srcDir = path.join(tmpDir, 'src');
        const dstDir = path.join(tmpDir, 'dst');
        await fs.mkdir(srcDir, { recursive: true });
        await fs.mkdir(dstDir, { recursive: true });

        await fs.writeFile(path.join(srcDir, 'main.md'), 'main');
        await fs.writeFile(path.join(srcDir, 'sibling.json'), 'extra');

        await move(path.join(srcDir, 'main.md'), path.join(dstDir, 'main.md'));

        await expect(fs.access(path.join(dstDir, 'main.md'))).resolves.toBeUndefined();
        await expect(fs.access(path.join(dstDir, 'sibling.json'))).resolves.toBeUndefined();
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('creates destination directory if missing', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const from = path.join(tmpDir, 'file.md');
        const to = path.join(tmpDir, 'new-dir', 'file.md');
        await fs.writeFile(from, 'data');

        await move(from, to, false);

        const content = await fs.readFile(to, 'utf8');
        expect(content).toBe('data');
      } finally {
        await rmTmpDir(tmpDir);
      }
    });
  });

  describe('getUpdateDate', () => {
    it('returns the mtime of an existing file as a Date', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const filePath = path.join(tmpDir, 'dated.md');
        await fs.writeFile(filePath, 'x');

        const result = await getUpdateDate(tmpDir, 'dated.md');
        expect(typeof result.getTime).toBe('function');
        expect(Number.isFinite(result.getTime())).toBe(true);
        // mtime should be recent
        expect(Date.now() - result.getTime()).toBeLessThan(5000);
      } finally {
        await rmTmpDir(tmpDir);
      }
    });

    it('returns a Date (fallback) for a missing file', async () => {
      const tmpDir = await makeTmpDir();
      try {
        const result = await getUpdateDate(tmpDir, 'no-such-file.md');
        expect(typeof result.getTime).toBe('function');
        expect(Number.isFinite(result.getTime())).toBe(true);
      } finally {
        await rmTmpDir(tmpDir);
      }
    });
  });
});
