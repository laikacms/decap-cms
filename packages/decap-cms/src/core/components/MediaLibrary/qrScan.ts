import type jsQRType from 'jsqr';

/**
 * DCMS-2229: QR-code decoding, split out from `QrScanDialog` so the actual
 * scanning logic is unit-testable independent of camera/DOM concerns (the
 * dialog itself needs `getUserMedia`, a live `<video>` element, and a
 * capture loop, none of which are worth exercising through jsdom).
 *
 * `jsqr` is a small (~14 KB min, zero-dependency) pure-JS QR decoder,
 * dynamically imported on first use so it only lands in a separate chunk
 * for sessions that actually open the QR-scan dialog, mirroring the
 * `widgets/code/keymapLoaders.ts` lazy-load pattern for optional,
 * not-everyone-needs-it decoder/emulation code.
 */

let jsQrPromise: Promise<typeof jsQRType> | undefined;

function loadJsQr(): Promise<typeof jsQRType> {
  jsQrPromise ??= import('jsqr').then(module => module.default);
  return jsQrPromise;
}

/**
 * Decodes a QR code from raw pixel data (e.g. a `getImageData()` result from
 * a video frame or an uploaded image drawn to a canvas). Returns the decoded
 * text, or `null` when no QR code is found.
 */
export async function decodeQrFromImageData(
  imageData: Pick<ImageData, 'data' | 'width' | 'height'>,
): Promise<string | null> {
  const jsQR = await loadJsQr();
  const result = jsQR(imageData.data as Uint8ClampedArray, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data ?? null;
}

/**
 * Decodes a QR code from an uploaded/dropped image file by rendering it to
 * an offscreen canvas first. Returns `null` both when the file can't be
 * decoded as an image and when it decodes but contains no QR code.
 */
export async function decodeQrFromImageSource(source: Blob): Promise<string | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return null;
  }

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return await decodeQrFromImageData(imageData);
  } finally {
    bitmap.close?.();
  }
}
