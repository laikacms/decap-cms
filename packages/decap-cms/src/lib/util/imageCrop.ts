import type { CmsImageCropConfig } from '@/lib/util/types/cms/media.js';

/**
 * Raster image MIME types eligible for the interactive crop step. SVGs are
 * vector and are intentionally excluded (there is no pixel grid to crop).
 * Mirrors `OPTIMIZABLE_MIME_TYPES` in `imageOptimization.ts`.
 */
const CROPPABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

export function isCroppableImage(file: File): boolean {
  return CROPPABLE_MIME_TYPES.has(file.type);
}

/**
 * `false`/`undefined`/missing `enabled` means the feature stays off; it is
 * opt-in per the DCMS-2011 scope sketch (same convention as
 * `isImageOptimizationEnabled`).
 */
export function isImageCropEnabled(
  config: CmsImageCropConfig | undefined,
): config is CmsImageCropConfig {
  return Boolean(config && config.enabled);
}

/** A crop selection in source-image pixel coordinates. */
export type CropRect = {
  x: number,
  y: number,
  width: number,
  height: number,
};

const MIN_CROP_SIZE = 1;

/**
 * Clamps a crop rectangle so it stays fully inside a `boundsWidth` x
 * `boundsHeight` image: negative/overflowing origins are pulled back in
 * bounds first, then the size is capped to what's left, never dropping
 * below `MIN_CROP_SIZE`px. Pure so the drag/resize math driving the crop UI
 * is unit-testable without a real pointer or canvas.
 */
export function clampCropRect(rect: CropRect, boundsWidth: number, boundsHeight: number): CropRect {
  const width = Math.min(Math.max(rect.width, MIN_CROP_SIZE), Math.max(boundsWidth, MIN_CROP_SIZE));
  const height = Math.min(Math.max(rect.height, MIN_CROP_SIZE), Math.max(boundsHeight, MIN_CROP_SIZE));
  const x = Math.min(Math.max(rect.x, 0), Math.max(boundsWidth - width, 0));
  const y = Math.min(Math.max(rect.y, 0), Math.max(boundsHeight - height, 0));
  return { x, y, width, height };
}

/**
 * Adjusts `rect` so `width / height === aspectRatio`, keeping its center
 * fixed and shrinking whichever dimension needs it (never grows past the
 * original rect, so it can't push outside bounds a caller already clamped
 * to). The result is re-clamped to bounds since re-centering can shift the
 * origin slightly.
 */
export function constrainCropRectToAspectRatio(
  rect: CropRect,
  aspectRatio: number,
  boundsWidth: number,
  boundsHeight: number,
): CropRect {
  if (!aspectRatio || aspectRatio <= 0) {
    return rect;
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  let width = rect.width;
  let height = rect.height;
  const currentRatio = width / height;

  if (currentRatio > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  const nextRect: CropRect = {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };

  return clampCropRect(nextRect, boundsWidth, boundsHeight);
}

/**
 * The default crop selection offered when the dialog opens: centered, and
 * as large as possible while respecting `aspectRatio` (when given).
 */
export function initialCropRect(
  sourceWidth: number,
  sourceHeight: number,
  aspectRatio: number | undefined,
): CropRect {
  const full: CropRect = { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  if (!aspectRatio || aspectRatio <= 0) {
    return full;
  }
  return constrainCropRectToAspectRatio(full, aspectRatio, sourceWidth, sourceHeight);
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

type CanvasLike = {
  getContext: (contextId: '2d') => {
    drawImage: (
      image: ImageBitmap,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ) => void,
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
    return canvas.convertToBlob({ type: mimeType, ...(quality === undefined ? {} : { quality }) });
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
 * Crops `file` down to `cropRect` (source-image pixel coordinates) via
 * canvas/OffscreenCanvas, preserving the source's own format (no re-encode
 * beyond what the crop itself requires; on-upload format conversion is
 * `optimizeImageFile`'s job, not this one's, so the two compose instead of
 * overlapping). Returns a new `File` with the same name and MIME type. On
 * any failure (e.g. an environment without canvas support, or a
 * degenerate/zero-size rect) the original file is returned rather than
 * blocking the upload.
 */
export async function cropImageFile(file: File, cropRect: CropRect): Promise<File> {
  if (cropRect.width < MIN_CROP_SIZE || cropRect.height < MIN_CROP_SIZE) {
    return file;
  }

  try {
    const bitmap = await loadImageBitmap(file);
    try {
      const rect = clampCropRect(cropRect, bitmap.width, bitmap.height);
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return file;
      }
      ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, file.type, undefined);
      return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
    } finally {
      bitmap.close?.();
    }
  } catch (error: unknown) {
    console.error('Image crop failed; using original file', error);
    return file;
  }
}
