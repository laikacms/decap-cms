import type { CmsImageOptimizationConfig } from '@/lib/util/types/cms/media.js';

/**
 * Raster image MIME types eligible for client-side optimization. SVGs are
 * vector and are intentionally excluded here (SVG minification is tracked
 * separately, see DCMS-1397 follow-up).
 */
const OPTIMIZABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

const FORMAT_TO_MIME_TYPE: Record<'webp' | 'jpeg' | 'png', string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export function isOptimizableImage(file: File): boolean {
  return OPTIMIZABLE_MIME_TYPES.has(file.type);
}

/**
 * `false`/`undefined`/missing `enabled` means the feature stays off; it is
 * opt-in per the DCMS-1397 scope sketch.
 */
export function isImageOptimizationEnabled(
  config: CmsImageOptimizationConfig | undefined,
): config is CmsImageOptimizationConfig {
  return Boolean(config && config.enabled);
}

export type TargetDimensions = {
  width: number,
  height: number,
};

/**
 * Pure dimension math, factored out so it is unit-testable without a real
 * (or mocked) canvas. Scales `{ sourceWidth, sourceHeight }` down to fit
 * within `maxWidth`/`maxHeight` while preserving aspect ratio. Images
 * already within bounds are left untouched (this never upscales). Absent
 * bounds are treated as unconstrained.
 */
export function calculateTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number | undefined,
  maxHeight: number | undefined,
): TargetDimensions {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: sourceWidth, height: sourceHeight };
  }

  let scale = 1;
  if (maxWidth && sourceWidth > maxWidth) {
    scale = Math.min(scale, maxWidth / sourceWidth);
  }
  if (maxHeight && sourceHeight > maxHeight) {
    scale = Math.min(scale, maxHeight / sourceHeight);
  }

  if (scale >= 1) {
    return { width: sourceWidth, height: sourceHeight };
  }

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

/**
 * Resolves the output MIME type for a given config + source file. `'original'`
 * (or an unset `format`) keeps the source's own MIME type so only resizing is
 * applied.
 */
export function resolveTargetMimeType(
  format: CmsImageOptimizationConfig['format'],
  sourceMimeType: string,
): string {
  if (!format || format === 'original') {
    return sourceMimeType;
  }
  return FORMAT_TO_MIME_TYPE[format] ?? sourceMimeType;
}

function replaceExtension(fileName: string, mimeType: string): string {
  const extension = MIME_TYPE_TO_EXTENSION[mimeType];
  if (!extension) {
    return fileName;
  }
  const dotIndex = fileName.lastIndexOf('.');
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${base}.${extension}`;
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

type CanvasLike = {
  getContext: (contextId: '2d') => {
    drawImage: (image: ImageBitmap, dx: number, dy: number, dw: number, dh: number) => void,
  } | null,
  convertToBlob?: (options: { type: string, quality?: number }) => Promise<Blob>,
  toBlob?: (
    callback: (blob: Blob | null) => void,
    type: string,
    quality?: number,
  ) => void,
};

function createCanvas(width: number, height: number): CanvasLike {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height) as unknown as CanvasLike;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas as unknown as CanvasLike;
}

async function canvasToBlob(
  canvas: CanvasLike,
  mimeType: string,
  quality: number | undefined,
): Promise<Blob> {
  if (canvas.convertToBlob) {
    return canvas.convertToBlob({ type: mimeType, quality });
  }
  if (canvas.toBlob) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob!(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas failed to produce a blob'))),
        mimeType,
        quality,
      );
    });
  }
  throw new Error('No canvas blob export method available (convertToBlob/toBlob)');
}

/**
 * Client-side, opt-in image optimization applied at upload time (DCMS-1397):
 * resizes a raster image to fit within `max_width`/`max_height` and
 * optionally re-encodes it (e.g. to WebP) via canvas/OffscreenCanvas, before
 * the file is handed to the backend for storage. Non-raster files (SVG and
 * anything not in `OPTIMIZABLE_MIME_TYPES`) and already-in-bounds images
 * whose format is unchanged are returned unmodified. On any failure (e.g. an
 * environment without canvas support) the original file is returned rather
 * than blocking the upload.
 */
export async function optimizeImageFile(
  file: File,
  config: CmsImageOptimizationConfig,
): Promise<File> {
  if (!isImageOptimizationEnabled(config) || !isOptimizableImage(file)) {
    return file;
  }

  try {
    const bitmap = await loadImageBitmap(file);
    try {
      const { width, height } = calculateTargetDimensions(
        bitmap.width,
        bitmap.height,
        config.max_width,
        config.max_height,
      );
      const targetMimeType = resolveTargetMimeType(config.format, file.type);
      const formatUnchanged = targetMimeType === file.type;

      if (formatUnchanged && width === bitmap.width && height === bitmap.height) {
        // Nothing to do: already within bounds and no format conversion requested.
        return file;
      }

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return file;
      }
      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, targetMimeType, config.quality);
      const name = replaceExtension(file.name, targetMimeType);
      return new File([blob], name, { type: targetMimeType, lastModified: file.lastModified });
    } finally {
      bitmap.close?.();
    }
  } catch (error: unknown) {
    console.error('Image optimization failed; using original file', error);
    return file;
  }
}
