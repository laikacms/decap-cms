import { describe, expect, it } from 'vitest';

import { isRecognizedImageFile } from '@/lib/util/imageContentValidation.js';

const PNG_MAGIC_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_MAGIC_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const GIF_MAGIC_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const BMP_MAGIC_BYTES = new Uint8Array([0x42, 0x4d, 0, 0, 0, 0]);
const WEBP_MAGIC_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

describe('isRecognizedImageFile', () => {
  it('rejects a 20-byte text file renamed with a .png extension', async () => {
    const fakePng = new File(['a'.repeat(20)], 'qa-bad.png', { type: 'image/png' });
    expect(await isRecognizedImageFile(fakePng)).toBe(false);
  });

  it('accepts a real PNG whose extension has been renamed to .jpg', async () => {
    const renamedPng = new File([PNG_MAGIC_BYTES], 'photo.jpg', { type: 'image/jpeg' });
    expect(await isRecognizedImageFile(renamedPng)).toBe(true);
  });

  it('accepts a real JPEG regardless of declared MIME type', async () => {
    const file = new File([JPEG_MAGIC_BYTES], 'photo.png', { type: 'image/png' });
    expect(await isRecognizedImageFile(file)).toBe(true);
  });

  it('accepts GIF, BMP, and WebP by magic bytes', async () => {
    expect(await isRecognizedImageFile(new File([GIF_MAGIC_BYTES], 'a.gif'))).toBe(true);
    expect(await isRecognizedImageFile(new File([BMP_MAGIC_BYTES], 'a.bmp'))).toBe(true);
    expect(await isRecognizedImageFile(new File([WEBP_MAGIC_BYTES], 'a.webp'))).toBe(true);
  });

  it('accepts SVG content by leading <svg or <?xml text', async () => {
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'a.svg', {
      type: 'image/svg+xml',
    });
    const xmlSvg = new File(['<?xml version="1.0"?><svg></svg>'], 'a.svg', {
      type: 'image/svg+xml',
    });
    expect(await isRecognizedImageFile(svg)).toBe(true);
    expect(await isRecognizedImageFile(xmlSvg)).toBe(true);
  });

  it('rejects an empty file', async () => {
    const empty = new File([], 'empty.png', { type: 'image/png' });
    expect(await isRecognizedImageFile(empty)).toBe(false);
  });

  it('rejects a PDF disguised as a PNG', async () => {
    const pdf = new File(['%PDF-1.4\n'], 'fake.png', { type: 'image/png' });
    expect(await isRecognizedImageFile(pdf)).toBe(false);
  });
});
