import { blobToFileObj, getMediaAsBlob, getMediaDisplayURL, runWithLock } from '../implementation';

describe('implementation', () => {
  describe('blobToFileObj', () => {
    it('returns a File with the given name for a non-svg file without forcing MIME type', () => {
      const blob = new Blob(['data'], { type: 'image/png' });
      const file = blobToFileObj('image.png', blob);
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('image.png');
      expect(file.type).not.toBe('image/svg+xml');
    });

    it('returns a File with type image/svg+xml for a .svg filename', () => {
      const blob = new Blob(['<svg/>'], { type: 'text/plain' });
      const file = blobToFileObj('icon.svg', blob);
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('icon.svg');
      expect(file.type).toBe('image/svg+xml');
    });
  });

  describe('getMediaAsBlob', () => {
    it('should return response blob on non svg file', async () => {
      const blob = {};
      const readFile = jest.fn().mockResolvedValue(blob);

      await expect(getMediaAsBlob('static/media/image.png', 'sha', readFile)).resolves.toBe(blob);

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/image.png', 'sha', {
        parseText: false,
      });
    });

    it('should return text blob on svg file', async () => {
      const text = 'svg';
      const readFile = jest.fn().mockResolvedValue(text);

      await expect(getMediaAsBlob('static/media/logo.svg', 'sha', readFile)).resolves.toEqual(
        new Blob([text], { type: 'image/svg+xml' }),
      );

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/logo.svg', 'sha', {
        parseText: true,
      });
    });
  });

  describe('runWithLock', () => {
    let lock;

    beforeEach(() => {
      lock = { acquire: jest.fn(), release: jest.fn() };
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('calls func, releases lock, and returns result when lock is acquired', async () => {
      lock.acquire.mockResolvedValue(true);
      const func = jest.fn().mockResolvedValue('result');

      const result = await runWithLock(lock, func, 'warn message');

      expect(func).toHaveBeenCalledTimes(1);
      expect(lock.release).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('warns with message but still calls func and releases lock when lock is not acquired', async () => {
      lock.acquire.mockResolvedValue(false);
      const func = jest.fn().mockResolvedValue('best-effort-result');

      const result = await runWithLock(lock, func, 'lock timeout warning');

      expect(console.warn).toHaveBeenCalledWith('lock timeout warning');
      expect(func).toHaveBeenCalledTimes(1);
      expect(lock.release).toHaveBeenCalledTimes(1);
      expect(result).toBe('best-effort-result');
    });

    it('releases lock in finally even when func throws', async () => {
      lock.acquire.mockResolvedValue(true);
      const error = new Error('func failed');
      const func = jest.fn().mockRejectedValue(error);

      await expect(runWithLock(lock, func, 'warn message')).rejects.toThrow('func failed');

      expect(lock.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMediaDisplayURL', () => {
    it('should return createObjectURL result', async () => {
      const blob = {};
      const readFile = jest.fn().mockResolvedValue(blob);
      const semaphore = { take: jest.fn(callback => callback()), leave: jest.fn() };

      global.URL.createObjectURL = jest
        .fn()
        .mockResolvedValue('blob:http://localhost:8080/blob-id');

      await expect(
        getMediaDisplayURL({ path: 'static/media/image.png', id: 'sha' }, readFile, semaphore),
      ).resolves.toBe('blob:http://localhost:8080/blob-id');

      expect(semaphore.take).toHaveBeenCalledTimes(1);
      expect(semaphore.leave).toHaveBeenCalledTimes(1);

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/image.png', 'sha', {
        parseText: false,
      });

      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    });
  });
});
