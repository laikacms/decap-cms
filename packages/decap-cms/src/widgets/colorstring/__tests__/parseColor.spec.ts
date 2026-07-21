import { describe, expect, it } from 'vitest';

import { parseColor, toHexString, toRgbaString } from '@/widgets/colorstring/parseColor';

describe('parseColor', () => {
  describe('hex', () => {
    it('parses 6-digit hex', () => {
      expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('parses 3-digit hex by doubling each channel', () => {
      expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('parses 8-digit hex with alpha', () => {
      expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
    });

    it('parses 4-digit hex by doubling each channel including alpha', () => {
      expect(parseColor('#f008')).toEqual({ r: 255, g: 0, b: 0, a: 0x88 / 255 });
    });

    it('is case-insensitive', () => {
      expect(parseColor('#FF0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('trims surrounding whitespace', () => {
      expect(parseColor('  #ff0000  ')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('returns null for non-hex characters', () => {
      expect(parseColor('#zzzzzz')).toBeNull();
    });

    it('returns null for an invalid hex length', () => {
      expect(parseColor('#ff000')).toBeNull();
      expect(parseColor('#ff00000')).toBeNull();
      expect(parseColor('#ff0000000')).toBeNull();
    });
  });

  describe('named colors', () => {
    it('parses a named color to its hex equivalent', () => {
      expect(parseColor('red')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('is case-insensitive for named colors', () => {
      expect(parseColor('ReD')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('parses rebeccapurple', () => {
      expect(parseColor('rebeccapurple')).toEqual({ r: 0x66, g: 0x33, b: 0x99, a: 1 });
    });

    it('returns null for an unknown named color', () => {
      expect(parseColor('notacolor')).toBeNull();
    });
  });

  describe('transparent', () => {
    it('parses "transparent" to fully transparent black', () => {
      expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });
  });

  describe('rgb()/rgba()', () => {
    it('parses a valid rgb() triple', () => {
      expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    });

    it('parses a valid rgba() quadruple', () => {
      expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    });

    it('parses rgb() with no whitespace between components', () => {
      expect(parseColor('rgb(10,20,30)')).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    });

    it('clamps out-of-range rgb channels to 255', () => {
      expect(parseColor('rgb(300, 999, 0)')).toEqual({ r: 255, g: 255, b: 0, a: 1 });
    });

    it('clamps out-of-range alpha to 1', () => {
      expect(parseColor('rgba(10, 20, 30, 5)')).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    });

    it('returns null when the alpha channel is not a number', () => {
      expect(parseColor('rgba(10, 20, 30, notanumber)')).toBeNull();
    });

    it('returns null for rgb() missing a channel', () => {
      expect(parseColor('rgb(10, 20)')).toBeNull();
    });

    it('returns null for rgb() with a 4-digit channel', () => {
      expect(parseColor('rgb(1000, 20, 30)')).toBeNull();
    });

    it('returns null for malformed rgb() syntax', () => {
      expect(parseColor('rgb 10, 20, 30')).toBeNull();
      expect(parseColor('rgb(10 20 30)')).toBeNull();
      expect(parseColor('rgba(10, 20, 30')).toBeNull();
    });
  });

  describe('invalid input', () => {
    it('returns null for undefined input', () => {
      expect(parseColor(undefined)).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(parseColor('')).toBeNull();
    });

    it('returns null for a whitespace-only string', () => {
      expect(parseColor('   ')).toBeNull();
    });

    it('returns null for arbitrary non-color text', () => {
      expect(parseColor('hello world')).toBeNull();
    });
  });
});

describe('toHexString', () => {
  it('formats an rgba color as a lowercase 6-digit hex string, dropping alpha', () => {
    expect(toHexString({ r: 255, g: 0, b: 0, a: 1 })).toBe('#ff0000');
  });

  it('pads single-digit hex channels with a leading zero', () => {
    expect(toHexString({ r: 1, g: 2, b: 3, a: 1 })).toBe('#010203');
  });

  it('round-trips through parseColor for rgb channels', () => {
    const parsed = parseColor('#123abc');
    expect(parsed).not.toBeNull();
    expect(toHexString(parsed!)).toBe('#123abc');
  });
});

describe('toRgbaString', () => {
  it('formats an rgba color as an rgba() string', () => {
    expect(toRgbaString({ r: 10, g: 20, b: 30, a: 0.5 })).toBe('rgba(10, 20, 30, 0.5)');
  });

  it('round-trips through parseColor', () => {
    const parsed = parseColor('rgba(10, 20, 30, 0.5)');
    expect(parsed).not.toBeNull();
    expect(toRgbaString(parsed!)).toBe('rgba(10, 20, 30, 0.5)');
  });
});
