import crypto from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { entriesFromFiles, normalizePath, readMediaFile } from '@/dev-server/middlewares/utils/entries';

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

describe('dev-server entries utils', () => {
  let repoPath: string;

  beforeEach(async () => {
    repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'decap-cms-entries-utils-'));
  });

  afterEach(async () => {
    await fs.rm(repoPath, { recursive: true, force: true });
  });

  describe('normalizePath', () => {
    it('converts windows backslashes to forward slashes', () => {
      expect(normalizePath('content\\posts\\a.md')).toBe('content/posts/a.md');
    });

    it('passes through paths already using forward slashes', () => {
      expect(normalizePath('content/posts/a.md')).toBe('content/posts/a.md');
    });
  });

  describe('entriesFromFiles', () => {
    it('reads existing files and returns content with a sha256 id', async () => {
      const content = 'hello world';
      await fs.writeFile(path.join(repoPath, 'a.md'), content);

      const entries = await entriesFromFiles(repoPath, [{ path: 'a.md', label: 'A' }]);

      expect(entries).toEqual([
        {
          data: content,
          file: { path: 'a.md', label: 'A', id: sha256(Buffer.from(content)) },
        },
      ]);
    });

    it('returns null data and id when the file cannot be read', async () => {
      const entries = await entriesFromFiles(repoPath, [{ path: 'missing.md', label: 'Missing' }]);

      expect(entries).toEqual([
        {
          data: null,
          file: { path: 'missing.md', label: 'Missing', id: null },
        },
      ]);
    });

    it('normalizes windows-style paths in the returned file path', async () => {
      const entries = await entriesFromFiles(repoPath, [{ path: 'nested\\missing.md' }]);

      expect(entries[0].file.path).toBe('nested/missing.md');
    });
  });

  describe('readMediaFile', () => {
    it('reads the file as a base64-encoded buffer with a sha256 id and basename', async () => {
      const content = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      await fs.mkdir(path.join(repoPath, 'images'), { recursive: true });
      await fs.writeFile(path.join(repoPath, 'images', 'logo.png'), content);

      const result = await readMediaFile(repoPath, path.join('images', 'logo.png'));

      expect(result).toEqual({
        id: sha256(content),
        content: content.toString('base64'),
        encoding: 'base64',
        path: 'images/logo.png',
        name: 'logo.png',
      });
    });

    it('rejects when the file does not exist', async () => {
      await expect(readMediaFile(repoPath, 'missing.png')).rejects.toThrow();
    });
  });
});
