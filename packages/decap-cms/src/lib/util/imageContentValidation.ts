/**
 * Content-based (magic-byte) image validation. Unlike `isCroppableImage`
 * (which trusts the browser-guessed `file.type`), this inspects the actual
 * leading bytes of the file so a text file renamed to `.png` cannot pass as
 * an image. Used to gate persistence in the image-scoped media picker
 * (DCMS-2173).
 */

const SNIFF_BYTE_COUNT = 12;

function bytesStartWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) {
    return false;
  }
  return prefix.every((byte, index) => bytes[index] === byte);
}

function isRasterMagicBytes(bytes: Uint8Array): boolean {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return true;
  }
  // JPEG: FF D8 FF
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) {
    return true;
  }
  // GIF: "GIF8"
  if (bytesStartWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return true;
  }
  // BMP: "BM"
  if (bytesStartWith(bytes, [0x42, 0x4d])) {
    return true;
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  return false;
}

function isSvgContent(text: string): boolean {
  const trimmed = text.replace(/^\uFEFF/, '').trimStart();
  return trimmed.startsWith('<?xml') || trimmed.startsWith('<svg');
}

/**
 * Sniffs the first bytes of a File to determine whether it is a recognized
 * raster image (PNG/JPEG/GIF/WebP/BMP) or an SVG, regardless of the file's
 * extension or the browser-reported MIME type.
 */
export async function isRecognizedImageFile(file: File): Promise<boolean> {
  const head = file.slice(0, SNIFF_BYTE_COUNT);
  const buffer = await head.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (isRasterMagicBytes(bytes)) {
    return true;
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  return isSvgContent(text);
}
