import { afterEach, describe, expect, it, vi } from 'vitest';

const jsQrMock = vi.fn();

vi.mock('jsqr', () => ({
  default: (...args: unknown[]) => jsQrMock(...args),
}));

import { decodeQrFromImageData, decodeQrFromImageSource } from '@/core/components/MediaLibrary/qrScan';

function fakeImageData(width: number, height: number): ImageData {
  return {
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('decodeQrFromImageData', () => {
  afterEach(() => {
    jsQrMock.mockReset();
  });

  it('returns the decoded text when jsQR finds a QR code', async () => {
    jsQrMock.mockReturnValue({ data: 'https://example.com/asset.png' });

    const result = await decodeQrFromImageData(fakeImageData(4, 4));

    expect(result).toBe('https://example.com/asset.png');
    expect(jsQrMock).toHaveBeenCalledTimes(1);
    const [data, width, height, options] = jsQrMock.mock.calls[0];
    expect(width).toBe(4);
    expect(height).toBe(4);
    expect(data).toBeInstanceOf(Uint8ClampedArray);
    expect(options).toEqual({ inversionAttempts: 'attemptBoth' });
  });

  it('returns null when jsQR finds nothing', async () => {
    jsQrMock.mockReturnValue(null);

    const result = await decodeQrFromImageData(fakeImageData(4, 4));

    expect(result).toBeNull();
  });
});

describe('decodeQrFromImageSource', () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalOffscreenCanvas = globalThis.OffscreenCanvas;

  afterEach(() => {
    jsQrMock.mockReset();
    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  });

  function stubImageBitmapPipeline(imageData: ImageData) {
    const close = vi.fn();
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({
      width: imageData.width,
      height: imageData.height,
      close,
    }) as unknown as typeof createImageBitmap;

    class FakeOffscreenCanvas {
      constructor(public width: number, public height: number) {}
      getContext() {
        return {
          drawImage: vi.fn(),
          getImageData: () => imageData,
        };
      }
    }
    globalThis.OffscreenCanvas = FakeOffscreenCanvas as unknown as typeof OffscreenCanvas;

    return { close };
  }

  it('decodes a QR code from an uploaded image blob', async () => {
    jsQrMock.mockReturnValue({ data: 'https://example.com/from-upload.png' });
    const { close } = stubImageBitmapPipeline(fakeImageData(8, 8));

    const result = await decodeQrFromImageSource(new Blob(['fake'], { type: 'image/png' }));

    expect(result).toBe('https://example.com/from-upload.png');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('returns null when the blob is not a decodable image', async () => {
    globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error('not an image'));

    const result = await decodeQrFromImageSource(new Blob(['not an image'], { type: 'text/plain' }));

    expect(result).toBeNull();
    expect(jsQrMock).not.toHaveBeenCalled();
  });

  it('returns null when the image decodes but contains no QR code', async () => {
    jsQrMock.mockReturnValue(null);
    stubImageBitmapPipeline(fakeImageData(8, 8));

    const result = await decodeQrFromImageSource(new Blob(['fake'], { type: 'image/png' }));

    expect(result).toBeNull();
  });
});
