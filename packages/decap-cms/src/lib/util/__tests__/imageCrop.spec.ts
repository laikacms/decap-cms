import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clampCropRect,
  constrainCropRectToAspectRatio,
  cropImageFile,
  initialCropRect,
  isCroppableImage,
  isImageCropEnabled,
} from '@/lib/util/imageCrop.js';

describe('isCroppableImage', () => {
  it('accepts common raster types', () => {
    expect(isCroppableImage(new File([], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isCroppableImage(new File([], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
  });

  it('rejects vector and non-image types', () => {
    expect(isCroppableImage(new File([], 'a.svg', { type: 'image/svg+xml' }))).toBe(false);
    expect(isCroppableImage(new File([], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
  });
});

describe('isImageCropEnabled', () => {
  it('is false when config is missing or enabled is falsy', () => {
    expect(isImageCropEnabled(undefined)).toBe(false);
    expect(isImageCropEnabled({})).toBe(false);
    expect(isImageCropEnabled({ enabled: false })).toBe(false);
  });

  it('is true only when explicitly enabled', () => {
    expect(isImageCropEnabled({ enabled: true })).toBe(true);
  });
});

describe('clampCropRect', () => {
  it('leaves an in-bounds rect untouched', () => {
    expect(clampCropRect({ x: 10, y: 10, width: 50, height: 50 }, 100, 100)).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 50,
    });
  });

  it('pulls a negative origin back to 0', () => {
    expect(clampCropRect({ x: -20, y: -5, width: 50, height: 50 }, 100, 100)).toEqual({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    });
  });

  it('caps size to the bounds and re-anchors the origin', () => {
    expect(clampCropRect({ x: 80, y: 80, width: 50, height: 50 }, 100, 100)).toEqual({
      x: 50,
      y: 50,
      width: 50,
      height: 50,
    });
  });

  it('never produces a zero or negative size', () => {
    const result = clampCropRect({ x: 0, y: 0, width: 0, height: -10 }, 100, 100);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('caps oversized rects to the image bounds', () => {
    expect(clampCropRect({ x: 0, y: 0, width: 500, height: 500 }, 100, 200)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 200,
    });
  });
});

describe('constrainCropRectToAspectRatio', () => {
  it('shrinks width to hit a wider-than-tall ratio, keeping the center fixed', () => {
    // 100x100 square centered at (50,50) constrained to 2:1 -> 100x50, still centered
    const result = constrainCropRectToAspectRatio({ x: 0, y: 0, width: 100, height: 100 }, 2, 200, 200);
    expect(result).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  });

  it('shrinks height to hit a taller-than-wide ratio, keeping the center fixed', () => {
    const result = constrainCropRectToAspectRatio({ x: 0, y: 0, width: 100, height: 100 }, 0.5, 200, 200);
    expect(result).toEqual({ x: 25, y: 0, width: 50, height: 100 });
  });

  it('is a no-op for a non-positive aspect ratio', () => {
    const rect = { x: 5, y: 5, width: 40, height: 60 };
    expect(constrainCropRectToAspectRatio(rect, 0, 200, 200)).toEqual(rect);
  });

  it('re-clamps into bounds after re-centering', () => {
    // Rect hugging the right edge; forcing a wider ratio would push past bounds,
    // so the result must still be fully inside [0, 100].
    const result = constrainCropRectToAspectRatio({ x: 90, y: 0, width: 10, height: 40 }, 4, 100, 100);
    expect(result.x + result.width).toBeLessThanOrEqual(100);
    expect(result.y + result.height).toBeLessThanOrEqual(100);
  });
});

describe('initialCropRect', () => {
  it('defaults to the full image when no aspect ratio is given', () => {
    expect(initialCropRect(800, 600, undefined)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('centers a square crop inside a landscape image', () => {
    expect(initialCropRect(800, 600, 1)).toEqual({ x: 100, y: 0, width: 600, height: 600 });
  });
});

describe('cropImageFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubCanvasPipeline(sourceWidth: number, sourceHeight: number, outputBlob: Blob) {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: sourceWidth, height: sourceHeight, close: vi.fn() }),
    );

    const convertToBlob = vi.fn().mockResolvedValue(outputBlob);
    const drawImage = vi.fn();
    class FakeOffscreenCanvas {
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }
      getContext() {
        return { drawImage };
      }
      convertToBlob = convertToBlob;
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
    return { convertToBlob, drawImage };
  }

  it('returns the original file untouched for a degenerate (zero-size) crop rect', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const result = await cropImageFile(file, { x: 0, y: 0, width: 0, height: 0 });
    expect(result).toBe(file);
  });

  it('draws the requested region and produces a new File of the crop size', async () => {
    const outputBlob = new Blob(['cropped'], { type: 'image/png' });
    const { convertToBlob, drawImage } = stubCanvasPipeline(1000, 800, outputBlob);
    const file = new File(['original'], 'photo.png', { type: 'image/png' });

    const result = await cropImageFile(file, { x: 100, y: 50, width: 400, height: 300 });

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 100, 50, 400, 300, 0, 0, 400, 300);
    expect(convertToBlob).toHaveBeenCalledWith({ type: 'image/png' });
    expect(result).toBeInstanceOf(File);
    expect(result).not.toBe(file);
    expect(result.name).toBe('photo.png');
    expect(result.type).toBe('image/png');
  });

  it('clamps a crop rect that overflows the source image bounds', async () => {
    const outputBlob = new Blob(['cropped'], { type: 'image/jpeg' });
    const { drawImage } = stubCanvasPipeline(100, 100, outputBlob);
    const file = new File(['original'], 'photo.jpg', { type: 'image/jpeg' });

    await cropImageFile(file, { x: 80, y: 80, width: 50, height: 50 });

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 50, 50, 50, 50, 0, 0, 50, 50);
  });

  it('falls back to the original file when the crop pipeline throws', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode failed')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    const result = await cropImageFile(file, { x: 0, y: 0, width: 10, height: 10 });

    expect(result).toBe(file);
  });
});
