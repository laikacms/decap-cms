import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  calculateTargetDimensions,
  isImageOptimizationEnabled,
  isOptimizableImage,
  optimizeImageFile,
  resolveTargetMimeType,
} from '@/lib/util/imageOptimization.js';

describe('calculateTargetDimensions', () => {
  it('leaves dimensions untouched when already within bounds', () => {
    expect(calculateTargetDimensions(400, 300, 800, 600)).toEqual({ width: 400, height: 300 });
  });

  it('leaves dimensions untouched when no bounds are given', () => {
    expect(calculateTargetDimensions(4000, 3000, undefined, undefined)).toEqual({
      width: 4000,
      height: 3000,
    });
  });

  it('scales down to fit max_width, preserving aspect ratio', () => {
    // 4000x2000 (2:1) constrained to max_width 1000 -> 1000x500
    expect(calculateTargetDimensions(4000, 2000, 1000, undefined)).toEqual({
      width: 1000,
      height: 500,
    });
  });

  it('scales down to fit max_height, preserving aspect ratio', () => {
    // 2000x4000 (1:2) constrained to max_height 1000 -> 500x1000
    expect(calculateTargetDimensions(2000, 4000, undefined, 1000)).toEqual({
      width: 500,
      height: 1000,
    });
  });

  it('applies the more restrictive of both bounds', () => {
    // 4000x1000 constrained to 1000x1000: width ratio 0.25, height ratio 1 -> width wins
    expect(calculateTargetDimensions(4000, 1000, 1000, 1000)).toEqual({
      width: 1000,
      height: 250,
    });
  });

  it('never upscales an image smaller than the bounds', () => {
    expect(calculateTargetDimensions(100, 50, 2000, 2000)).toEqual({ width: 100, height: 50 });
  });

  it('rounds fractional results and never produces a zero dimension', () => {
    const result = calculateTargetDimensions(4001, 3, 1000, undefined);
    expect(result.width).toBe(1000);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('passes through degenerate (non-positive) source dimensions unchanged', () => {
    expect(calculateTargetDimensions(0, 0, 100, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe('resolveTargetMimeType', () => {
  it('maps webp/jpeg/png formats to their MIME types', () => {
    expect(resolveTargetMimeType('webp', 'image/png')).toBe('image/webp');
    expect(resolveTargetMimeType('jpeg', 'image/png')).toBe('image/jpeg');
    expect(resolveTargetMimeType('png', 'image/jpeg')).toBe('image/png');
  });

  it('keeps the source MIME type for "original" or an unset format', () => {
    expect(resolveTargetMimeType('original', 'image/png')).toBe('image/png');
    expect(resolveTargetMimeType(undefined, 'image/gif')).toBe('image/gif');
  });
});

describe('isOptimizableImage', () => {
  it('accepts common raster types', () => {
    expect(isOptimizableImage(new File([], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isOptimizableImage(new File([], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isOptimizableImage(new File([], 'a.webp', { type: 'image/webp' }))).toBe(true);
  });

  it('rejects vector and non-image types', () => {
    expect(isOptimizableImage(new File([], 'a.svg', { type: 'image/svg+xml' }))).toBe(false);
    expect(isOptimizableImage(new File([], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
  });
});

describe('isImageOptimizationEnabled', () => {
  it('is false when config is missing or enabled is falsy', () => {
    expect(isImageOptimizationEnabled(undefined)).toBe(false);
    expect(isImageOptimizationEnabled({})).toBe(false);
    expect(isImageOptimizationEnabled({ enabled: false })).toBe(false);
  });

  it('is true only when explicitly enabled', () => {
    expect(isImageOptimizationEnabled({ enabled: true })).toBe(true);
  });
});

describe('optimizeImageFile', () => {
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

  it('returns the original file untouched when optimization is disabled', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const result = await optimizeImageFile(file, { enabled: false, max_width: 100 });
    expect(result).toBe(file);
  });

  it('returns the original file untouched for non-raster files (e.g. SVG)', async () => {
    const file = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' });
    const result = await optimizeImageFile(file, { enabled: true, max_width: 100 });
    expect(result).toBe(file);
  });

  it('skips re-encoding when the image is already within bounds and format is unchanged', async () => {
    const { convertToBlob } = stubCanvasPipeline(100, 100, new Blob());
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    const result = await optimizeImageFile(file, { enabled: true, max_width: 1000 });

    expect(result).toBe(file);
    expect(convertToBlob).not.toHaveBeenCalled();
  });

  it('resizes and converts to WebP, producing a renamed File', async () => {
    const outputBlob = new Blob(['optimized'], { type: 'image/webp' });
    const { convertToBlob, drawImage } = stubCanvasPipeline(4000, 2000, outputBlob);
    const file = new File(['original'], 'photo.png', { type: 'image/png' });

    const result = await optimizeImageFile(file, {
      enabled: true,
      max_width: 1000,
      format: 'webp',
      quality: 0.8,
    });

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1000, 500);
    expect(convertToBlob).toHaveBeenCalledWith({ type: 'image/webp', quality: 0.8 });
    expect(result).toBeInstanceOf(File);
    expect(result).not.toBe(file);
    expect(result.name).toBe('photo.webp');
    expect(result.type).toBe('image/webp');
  });

  it('falls back to the original file when the optimization pipeline throws', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode failed')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    const result = await optimizeImageFile(file, { enabled: true, max_width: 100 });

    expect(result).toBe(file);
  });
});
