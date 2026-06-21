import { stringToRGB } from '../textHelper';

describe('stringToRGB', () => {
  it('returns 000000 for empty string', () => {
    expect(stringToRGB('')).toBe('000000');
  });

  it('returns 000000 for null input', () => {
    expect(stringToRGB(null)).toBe('000000');
  });

  it('returns 000000 for undefined input', () => {
    expect(stringToRGB(undefined)).toBe('000000');
  });

  it('returns a 6-character uppercase hex string for a normal string', () => {
    const result = stringToRGB('hello');
    expect(result).toMatch(/^[0-9A-F]{6}$/);
  });

  it('is deterministic — same string produces same result', () => {
    expect(stringToRGB('hello')).toBe(stringToRGB('hello'));
  });

  it('returns known value for "hello"', () => {
    expect(stringToRGB('hello')).toBe('E918D2');
  });

  it('returns known value for "world"', () => {
    expect(stringToRGB('world')).toBe('C11B92');
  });

  it('produces different results for different strings', () => {
    expect(stringToRGB('hello')).not.toBe(stringToRGB('world'));
  });

  it('returns a 6-character uppercase hex string for a single-character string', () => {
    const result = stringToRGB('a');
    expect(result).toMatch(/^[0-9A-F]{6}$/);
    expect(result).toBe('000061');
  });
});
