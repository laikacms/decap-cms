import { describe, expect, it } from 'vitest';

import sanitizeFilename from '@/core/lib/sanitizeFilename';

describe('sanitizeFilename', () => {
  describe('unsafe character replacement', () => {
    it('strips characters forbidden on Windows, macOS, and Linux by default', () => {
      expect(sanitizeFilename('a/b<c>d?e\\f:g*h|i"j')).toBe('abcdefghij');
    });

    it('substitutes unsafe characters with a custom replacement', () => {
      expect(sanitizeFilename('a/b:c', { replacement: '_' })).toBe('a_b_c');
    });

    it('runs a second pass so a replacement string cannot reintroduce unsafe characters', () => {
      expect(sanitizeFilename('a/b', { replacement: ':' })).toBe('ab');
    });
  });

  describe('control code stripping', () => {
    it('removes C0 control characters (U+0000-U+001F)', () => {
      const nul = String.fromCharCode(0x00);
      const unitSeparator = String.fromCharCode(0x1f);
      expect(sanitizeFilename(`a${nul}b${unitSeparator}c`)).toBe('abc');
    });

    it('removes C1 control characters (U+0080-U+009F)', () => {
      const padding = String.fromCharCode(0x80);
      const apc = String.fromCharCode(0x9f);
      expect(sanitizeFilename(`a${padding}b${apc}c`)).toBe('abc');
    });

    it('substitutes control characters with a custom replacement', () => {
      const nul = String.fromCharCode(0x00);
      expect(sanitizeFilename(`a${nul}b`, { replacement: '_' })).toBe('a_b');
    });
  });

  describe('bidi/zero-width format code stripping (Trojan-Source, DCMS-1506)', () => {
    it('removes U+202E RIGHT-TO-LEFT OVERRIDE', () => {
      const rlo = String.fromCharCode(0x202e);
      const result = sanitizeFilename(`${rlo}hello`);
      expect(result).toBe('hello');
      expect(result).not.toContain(rlo);
    });

    it('removes the other bidi embedding/override/isolate controls (U+200E-U+200F, U+202A-U+202E, U+2066-U+2069)', () => {
      const bidiChars = [
        0x200e, // LEFT-TO-RIGHT MARK
        0x200f, // RIGHT-TO-LEFT MARK
        0x202a, // LEFT-TO-RIGHT EMBEDDING
        0x202b, // RIGHT-TO-LEFT EMBEDDING
        0x202c, // POP DIRECTIONAL FORMATTING
        0x202d, // LEFT-TO-RIGHT OVERRIDE
        0x202e, // RIGHT-TO-LEFT OVERRIDE
        0x2066, // LEFT-TO-RIGHT ISOLATE
        0x2067, // RIGHT-TO-LEFT ISOLATE
        0x2068, // FIRST STRONG ISOLATE
        0x2069, // POP DIRECTIONAL ISOLATE
      ].map(code => String.fromCharCode(code));

      for (const char of bidiChars) {
        const result = sanitizeFilename(`a${char}b`);
        expect(result).toBe('ab');
      }
    });

    it('removes zero-width joiner/non-joiner/space characters (U+200B-U+200D)', () => {
      const zeroWidthSpace = String.fromCharCode(0x200b);
      const zeroWidthNonJoiner = String.fromCharCode(0x200c);
      const zeroWidthJoiner = String.fromCharCode(0x200d);
      expect(sanitizeFilename(`a${zeroWidthSpace}b${zeroWidthNonJoiner}c${zeroWidthJoiner}d`)).toBe(
        'abcd',
      );
    });

    it('removes the byte order mark / zero width no-break space (U+FEFF)', () => {
      const bom = String.fromCharCode(0xfeff);
      expect(sanitizeFilename(`${bom}file.txt`)).toBe('file.txt');
    });

    it('substitutes format codes with a custom replacement', () => {
      const rlo = String.fromCharCode(0x202e);
      expect(sanitizeFilename(`a${rlo}b`, { replacement: '_' })).toBe('a_b');
    });
  });

  describe('Windows reserved device names', () => {
    it.each(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM9', 'LPT1', 'LPT9'])(
      'sanitizes the reserved device name %s',
      name => {
        expect(sanitizeFilename(name)).toBe('');
      },
    );

    it('matches device names case-insensitively', () => {
      expect(sanitizeFilename('con')).toBe('');
      expect(sanitizeFilename('Com1')).toBe('');
    });

    it('matches a reserved device name even with an extension', () => {
      expect(sanitizeFilename('CON.txt')).toBe('');
      expect(sanitizeFilename('com1.tar.gz')).toBe('');
    });

    it('does not treat a name that merely starts with a device name as reserved', () => {
      expect(sanitizeFilename('CONTRACT.txt')).toBe('CONTRACT.txt');
    });
  });

  describe('dots-only input', () => {
    it('sanitizes a single dot', () => {
      expect(sanitizeFilename('.')).toBe('');
    });

    it('sanitizes a name made up of only dots', () => {
      expect(sanitizeFilename('...')).toBe('');
    });
  });

  describe('trailing dot/space stripping', () => {
    it('strips trailing dots', () => {
      expect(sanitizeFilename('file...')).toBe('file');
    });

    it('strips trailing spaces', () => {
      expect(sanitizeFilename('file   ')).toBe('file');
    });

    it('strips a mix of trailing dots and spaces', () => {
      expect(sanitizeFilename('file. . .')).toBe('file');
    });

    it('does not strip leading or interior dots/spaces', () => {
      expect(sanitizeFilename('.hidden file.name')).toBe('.hidden file.name');
    });
  });

  describe('255-byte UTF-8 truncation', () => {
    it('leaves names under the byte limit untouched', () => {
      const name = 'a'.repeat(200);
      expect(sanitizeFilename(name)).toBe(name);
    });

    it('truncates ASCII names longer than 255 bytes down to exactly 255 bytes', () => {
      const name = 'a'.repeat(300);
      const result = sanitizeFilename(name);
      expect(new TextEncoder().encode(result).byteLength).toBe(255);
      expect(result).toBe('a'.repeat(255));
    });

    it('truncates multi-byte characters on a code point boundary, never splitting a 3-byte character', () => {
      // '中' is 3 bytes in UTF-8. 90 repeats = 270 bytes, over the 255-byte limit.
      const name = '中'.repeat(90);
      const result = sanitizeFilename(name);
      const byteLength = new TextEncoder().encode(result).byteLength;
      expect(byteLength).toBeLessThanOrEqual(255);
      // 255 / 3 = 85 whole code points fit exactly, with 0 bytes left over.
      expect(result).toBe('中'.repeat(85));
    });

    it('truncates surrogate-pair (4-byte) characters without splitting a pair', () => {
      // U+1F600 GRINNING FACE is a 4-byte character encoded as a surrogate pair in UTF-16.
      const emoji = String.fromCodePoint(0x1f600);
      const name = emoji.repeat(70); // 70 * 4 = 280 bytes, over the limit
      const result = sanitizeFilename(name);
      const byteLength = new TextEncoder().encode(result).byteLength;
      expect(byteLength).toBeLessThanOrEqual(255);
      expect(byteLength % 4).toBe(0);
      // Result must consist of whole code points only, never a lone surrogate.
      expect([...result].every(ch => ch === emoji)).toBe(true);
      // 255 / 4 = 63 whole code points fit exactly, with 3 bytes left over (dropped).
      expect(result).toBe(emoji.repeat(63));
    });
  });

  describe('non-string input', () => {
    it('throws a TypeError when given a number', () => {
      expect(() => sanitizeFilename(123 as unknown as string)).toThrow(TypeError);
    });

    it('throws a TypeError when given null', () => {
      expect(() => sanitizeFilename(null as unknown as string)).toThrow(TypeError);
    });

    it('throws a TypeError when given undefined', () => {
      expect(() => sanitizeFilename(undefined as unknown as string)).toThrow(TypeError);
    });

    it('throws a TypeError when given an object', () => {
      expect(() => sanitizeFilename({} as unknown as string)).toThrow(TypeError);
    });
  });
});
