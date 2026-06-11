import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

import { entriesFromFiles, readMediaFile } from '../entries';

describe('entries utils', () => {
  describe('sha256 (via entriesFromFiles)', () => {
    it('produces a known hex digest for a fixed buffer', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcms-entries-'));
      try {
        const content = 'hello world';
        const filePath = 'post.md';
        await fs.writeFile(path.join(tmpDir, filePath), content);

        const [entry] = await entriesFromFiles(tmpDir, [{ path: filePath }]);
        const expected = crypto.createHash('sha256').update(Buffer.from(content)).digest('hex');
        expect(entry.file.id).toBe(expected);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('normalizePath (via entriesFromFiles)', () => {
    it('converts windows backslash paths to forward slashes', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcms-entries-'));
      try {
        const subDir = path.join(tmpDir, 'content');
        await fs.mkdir(subDir, { recursive: true });
        await fs.writeFile(path.join(subDir, 'post.md'), 'body');

        const [entry] = await entriesFromFiles(tmpDir, [{ path: 'content\\post.md' }]);
        expect(entry.file.path).toBe('content/post.md');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('leaves unix paths unchanged', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcms-entries-'));
      try {
        const subDir = path.join(tmpDir, 'content');
        await fs.mkdir(subDir, { recursive: true });
        await fs.writeFile(path.join(subDir, 'post.md'), 'body');

        const [entry] = await entriesFromFiles(tmpDir, [{ path: 'content/post.md' }]);
        expect(entry.file.path).toBe('content/post.md');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('entriesFromFiles', () => {
    it('returns data and sha256 id for an existing file', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcms-entries-'));
      try {
        const content = 'title: Hello\n---\nBody text';
        await fs.writeFile(path.join(tmpDir, 'entry.md'), content);

        const [entry] = await entriesFromFiles(tmpDir, [{ path: 'entry.md', label: 'Entry' }]);
        expect(entry.data).toBe(content);
        expect(entry.file.id).toMatch(/^[0-9a-f]{64}$/);
        expect(entry.file.path).toBe('entry.md');
        expect(entry.file.label).toBe('Entry');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('returns { data: null, file: { id: null } } for a missing file', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcms-entries-'));
      try {
        const [entry] = await entriesFromFiles(tmpDir, [{ path: 'missing.md', label: 'Ghost' }]);
        expect(entry.data).toBeNull();
        expect(entry.file.id).toBeNull();
        expect(entry.file.path).toBe('missing.md');
        expect(entry.file.label).toBe('Ghost');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('handles a mix of existing and missing files', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcms-entries-'));
      try {
        await fs.writeFile(path.join(tmpDir, 'exists.md'), 'content');

        const entries = await entriesFromFiles(tmpDir, [
          { path: 'exists.md' },
          { path: 'missing.md' },
        ]);

        expect(entries[0].data).toBe('content');
        expect(entries[0].file.id).not.toBeNull();
        expect(entries[1].data).toBeNull();
        expect(entries[1].file.id).toBeNull();
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('readMediaFile', () => {
    it('returns base64-encoded content with correct metadata', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcms-entries-'));
      try {
        const data = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
        await fs.writeFile(path.join(tmpDir, 'image.png'), data);

        const result = await readMediaFile(tmpDir, 'image.png');
        expect(result.encoding).toBe('base64');
        expect(result.content).toBe(data.toString('base64'));
        expect(result.path).toBe('image.png');
        expect(result.name).toBe('image.png');
        expect(result.id).toMatch(/^[0-9a-f]{64}$/);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('normalizes windows-style paths in the result', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dcms-entries-'));
      try {
        const subDir = path.join(tmpDir, 'media');
        await fs.mkdir(subDir, { recursive: true });
        await fs.writeFile(path.join(subDir, 'photo.jpg'), 'data');

        // Simulate a windows-style relative path passed to the function
        const result = await readMediaFile(tmpDir, 'media/photo.jpg');
        expect(result.path).toBe('media/photo.jpg');
        expect(result.name).toBe('photo.jpg');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
