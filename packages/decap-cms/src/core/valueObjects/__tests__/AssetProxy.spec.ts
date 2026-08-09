import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAssetProxy } from '@/core/valueObjects/AssetProxy';

describe('AssetProxy', () => {
  describe('constructor', () => {
    it('uses the provided url when given', () => {
      const asset = createAssetProxy({ url: 'https://example.com/foo.png', path: 'foo.png' });

      expect(asset.url).toEqual('https://example.com/foo.png');
      expect(asset.fileObj).toBeUndefined();
      expect(asset.path).toEqual('foo.png');
    });

    it('derives the url from window.URL.createObjectURL when only file is given', () => {
      const createObjectURL = vi
        .spyOn(window.URL, 'createObjectURL')
        .mockReturnValue('blob:mock-object-url');
      const file = new File(['content'], 'foo.png', { type: 'image/png' });

      const asset = createAssetProxy({ file, path: 'foo.png' });

      expect(createObjectURL).toHaveBeenCalledWith(file);
      expect(asset.url).toEqual('blob:mock-object-url');
      expect(asset.fileObj).toBe(file);

      createObjectURL.mockRestore();
    });

    it('defaults url to an empty string when neither url nor file is given', () => {
      const asset = createAssetProxy({ path: 'foo.png' });

      expect(asset.url).toEqual('');
      expect(asset.fileObj).toBeUndefined();
    });

    it('carries through path and field', () => {
      const field = { name: 'image' };
      const asset = createAssetProxy({ url: 'https://example.com/foo.png', path: 'foo.png', field });

      expect(asset.path).toEqual('foo.png');
      expect(asset.field).toBe(field);
    });
  });

  describe('toString', () => {
    it('returns the url when set', () => {
      const asset = createAssetProxy({ url: 'https://example.com/foo.png', path: 'foo.png' });

      expect(asset.toString()).toEqual('https://example.com/foo.png');
    });

    it('returns an empty string when url is empty', () => {
      const asset = createAssetProxy({ path: 'foo.png' });

      expect(asset.toString()).toEqual('');
    });
  });

  describe('toBase64', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns an empty string early when there is no url', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const asset = createAssetProxy({ path: 'foo.png' });

      await expect(asset.toBase64()).resolves.toEqual('');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns an empty string early when the fetched blob has zero size', async () => {
      const blob = { size: 0 } as Blob;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ blob: () => Promise.resolve(blob) }),
      );

      const asset = createAssetProxy({ url: 'https://example.com/foo.png', path: 'foo.png' });

      await expect(asset.toBase64()).resolves.toEqual('');
    });

    it('extracts the base64 payload from the FileReader result', async () => {
      const blob = { size: 4 } as Blob;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ blob: () => Promise.resolve(blob) }),
      );

      class MockFileReader {
        onload: ((event: { target: { result: string } }) => void) | null = null;
        readAsDataURL(): void {
          this.onload?.({ target: { result: 'data:image/png;base64,Zm9v' } });
        }
      }
      vi.stubGlobal('FileReader', MockFileReader);

      const asset = createAssetProxy({ url: 'https://example.com/foo.png', path: 'foo.png' });

      await expect(asset.toBase64()).resolves.toEqual('Zm9v');
    });

    it('fetches and reads the asset only once across repeated calls', async () => {
      const blob = { size: 4 } as Blob;
      const fetchSpy = vi.fn().mockResolvedValue({ blob: () => Promise.resolve(blob) });
      vi.stubGlobal('fetch', fetchSpy);

      const readAsDataURL = vi.fn();
      class MockFileReader {
        onload: ((event: { target: { result: string } }) => void) | null = null;
        readAsDataURL(): void {
          readAsDataURL();
          this.onload?.({ target: { result: 'data:image/png;base64,Zm9v' } });
        }
      }
      vi.stubGlobal('FileReader', MockFileReader);

      const asset = createAssetProxy({ url: 'https://example.com/foo.png', path: 'foo.png' });

      const [first, second] = await Promise.all([asset.toBase64(), asset.toBase64()]);
      const third = await asset.toBase64();

      expect([first, second, third]).toEqual(['Zm9v', 'Zm9v', 'Zm9v']);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(readAsDataURL).toHaveBeenCalledTimes(1);
    });

    it('reads the constructor file without fetching the object url', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock-object-url');

      class MockFileReader {
        onload: ((event: { target: { result: string } }) => void) | null = null;
        readAsDataURL(): void {
          this.onload?.({ target: { result: 'data:image/png;base64,Zm9v' } });
        }
      }
      vi.stubGlobal('FileReader', MockFileReader);

      const file = new File(['content'], 'foo.png', { type: 'image/png' });
      const asset = createAssetProxy({ file, path: 'foo.png' });

      await expect(asset.toBase64()).resolves.toEqual('Zm9v');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
