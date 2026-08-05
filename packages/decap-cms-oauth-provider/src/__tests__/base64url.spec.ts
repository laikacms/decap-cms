import '../test-setup.js';

import { base64UrlToBytes, base64UrlToText, bytesToBase64Url, textToBase64Url } from '../base64url';

describe('base64url', () => {
  describe('bytesToBase64Url / base64UrlToBytes round-trip', () => {
    it('round-trips an empty input', () => {
      const bytes = new Uint8Array([]);
      const encoded = bytesToBase64Url(bytes);
      expect(encoded).toEqual('');
      expect(base64UrlToBytes(encoded)).toEqual(bytes);
    });

    it('round-trips a single-byte input', () => {
      const bytes = new Uint8Array([0x41]);
      const encoded = bytesToBase64Url(bytes);
      expect(base64UrlToBytes(encoded)).toEqual(bytes);
    });

    it('round-trips a multi-byte input', () => {
      const bytes = new Uint8Array([0x00, 0x7f, 0x80, 0xff, 0x10, 0x20, 0x30]);
      const encoded = bytesToBase64Url(bytes);
      expect(base64UrlToBytes(encoded)).toEqual(bytes);
    });
  });

  describe('url-safe substitution', () => {
    it('replaces + and / with - and _, and strips = padding', () => {
      // 0xff 0xff 0xfe -> standard base64 "///+" (contains both '/' and '+', no padding)
      const bytes = new Uint8Array([0xff, 0xff, 0xfe]);
      const encoded = bytesToBase64Url(bytes);
      expect(encoded).toEqual('___-');
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('never emits url-unsafe characters for a range of inputs', () => {
      for (let len = 0; len < 16; len += 1) {
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i += 1) {
          bytes[i] = (i * 37 + 11) % 256;
        }
        const encoded = bytesToBase64Url(bytes);
        expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
      }
    });
  });

  describe('textToBase64Url / base64UrlToText round-trip', () => {
    it('round-trips ASCII text', () => {
      const text = 'the quick brown fox jumps over the lazy dog';
      const encoded = textToBase64Url(text);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
      expect(base64UrlToText(encoded)).toEqual(text);
    });

    it('round-trips multi-byte UTF-8 text', () => {
      const text = '日本語のテキスト 🎉 café';
      const encoded = textToBase64Url(text);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
      expect(base64UrlToText(encoded)).toEqual(text);
    });

    it('round-trips an empty string', () => {
      const encoded = textToBase64Url('');
      expect(encoded).toEqual('');
      expect(base64UrlToText(encoded)).toEqual('');
    });
  });

  describe('base64UrlToBytes padding reconstruction', () => {
    it('decodes an input whose length mod 4 is 0 (no padding needed)', () => {
      // 3 raw bytes encode to exactly 4 base64url chars, no padding.
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      const encoded = bytesToBase64Url(bytes);
      expect(encoded.length % 4).toEqual(0);
      expect(base64UrlToBytes(encoded)).toEqual(bytes);
    });

    it('decodes an input whose length mod 4 is 2 (pads back to ==)', () => {
      // 1 raw byte encodes to 2 base64url chars; standard base64 would pad with '=='.
      const bytes = new Uint8Array([0xab]);
      const encoded = bytesToBase64Url(bytes);
      expect(encoded.length % 4).toEqual(2);
      expect(base64UrlToBytes(encoded)).toEqual(bytes);
    });

    it('decodes an input whose length mod 4 is 3 (pads back to =)', () => {
      // 2 raw bytes encode to 3 base64url chars; standard base64 would pad with '='.
      const bytes = new Uint8Array([0xab, 0xcd]);
      const encoded = bytesToBase64Url(bytes);
      expect(encoded.length % 4).toEqual(3);
      expect(base64UrlToBytes(encoded)).toEqual(bytes);
    });

    it('throws for an input whose length mod 4 is 1 (not a valid base64url length)', () => {
      // No valid base64(url) encoding ever produces a string with length % 4 === 1 - a
      // single leftover character can't represent a whole number of 6-bit groups even with
      // padding. base64UrlToBytes should surface this as a decode failure, not silently
      // truncate or misalign the bytes.
      expect('a'.length % 4).toEqual(1);
      expect(() => base64UrlToBytes('a')).toThrow();
      expect('abcde'.length % 4).toEqual(1);
      expect(() => base64UrlToBytes('abcde')).toThrow();
    });
  });
});
