import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { listRepoFiles, listRepoFolders } from '@/dev-server/middlewares/utils/fs';

describe('dev-server fs utils', () => {
  let repoPath: string;

  beforeEach(async () => {
    repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'decap-cms-fs-utils-'));
  });

  afterEach(async () => {
    await fs.rm(repoPath, { recursive: true, force: true });
  });

  describe('listRepoFiles', () => {
    it('filters results by extension', async () => {
      await fs.writeFile(path.join(repoPath, 'a.md'), '');
      await fs.writeFile(path.join(repoPath, 'b.txt'), '');

      const files = await listRepoFiles(repoPath, '', '.md', 10);

      expect(files).toEqual(['a.md']);
    });

    it('returns an empty array when depth is 0', async () => {
      await fs.writeFile(path.join(repoPath, 'a.md'), '');

      const files = await listRepoFiles(repoPath, '', '.md', 0);

      expect(files).toEqual([]);
    });

    it('recurses into nested directories up to the given depth', async () => {
      await fs.mkdir(path.join(repoPath, 'nested', 'deeper'), { recursive: true });
      await fs.writeFile(path.join(repoPath, 'top.md'), '');
      await fs.writeFile(path.join(repoPath, 'nested', 'mid.md'), '');
      await fs.writeFile(path.join(repoPath, 'nested', 'deeper', 'bottom.md'), '');

      const files = await listRepoFiles(repoPath, '', '.md', 10);

      expect(files.sort()).toEqual(
        ['top.md', path.join('nested', 'mid.md'), path.join('nested', 'deeper', 'bottom.md')].sort(),
      );
    });

    it('stops recursing once the depth cutoff is reached', async () => {
      await fs.mkdir(path.join(repoPath, 'nested', 'deeper'), { recursive: true });
      await fs.writeFile(path.join(repoPath, 'nested', 'mid.md'), '');
      await fs.writeFile(path.join(repoPath, 'nested', 'deeper', 'bottom.md'), '');

      const files = await listRepoFiles(repoPath, '', '.md', 1);

      expect(files).toEqual([]);
    });

    it('strips the repoPath prefix from returned paths', async () => {
      await fs.mkdir(path.join(repoPath, 'content'), { recursive: true });
      await fs.writeFile(path.join(repoPath, 'content', 'post.md'), '');

      const files = await listRepoFiles(repoPath, '', '.md', 10);

      expect(files).toEqual([path.join('content', 'post.md')]);
      files.forEach(file => expect(path.isAbsolute(file)).toBe(false));
    });

    it('lists files under the given folder relative to repoPath', async () => {
      await fs.mkdir(path.join(repoPath, 'content'), { recursive: true });
      await fs.writeFile(path.join(repoPath, 'content', 'post.md'), '');
      await fs.writeFile(path.join(repoPath, 'other.md'), '');

      const files = await listRepoFiles(repoPath, 'content', '.md', 10);

      expect(files).toEqual([path.join('content', 'post.md')]);
    });

    it('returns an empty array for a non-existent folder', async () => {
      const files = await listRepoFiles(repoPath, 'does-not-exist', '.md', 10);

      expect(files).toEqual([]);
    });
  });

  describe('listRepoFolders', () => {
    it('returns only directories, excluding files', async () => {
      await fs.mkdir(path.join(repoPath, 'posts'));
      await fs.mkdir(path.join(repoPath, 'pages'));
      await fs.writeFile(path.join(repoPath, 'README.md'), '');

      const folders = await listRepoFolders(repoPath, '');

      expect(folders.sort()).toEqual(['pages', 'posts'].sort());
    });

    it('returns folder paths joined with the given folder argument', async () => {
      await fs.mkdir(path.join(repoPath, 'content', 'posts'), { recursive: true });
      await fs.mkdir(path.join(repoPath, 'content', 'pages'), { recursive: true });

      const folders = await listRepoFolders(repoPath, 'content');

      expect(folders.sort()).toEqual(
        [path.join('content', 'posts'), path.join('content', 'pages')].sort(),
      );
    });

    it('returns an empty array when there are no subdirectories', async () => {
      await fs.writeFile(path.join(repoPath, 'only-a-file.md'), '');

      const folders = await listRepoFolders(repoPath, '');

      expect(folders).toEqual([]);
    });

    it('returns an empty array for a non-existent folder', async () => {
      const folders = await listRepoFolders(repoPath, 'does-not-exist');

      expect(folders).toEqual([]);
    });
  });
});
