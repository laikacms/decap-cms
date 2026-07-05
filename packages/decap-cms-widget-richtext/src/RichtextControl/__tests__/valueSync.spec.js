import { shouldEmitChange } from '../valueSync';

describe('shouldEmitChange', () => {
  it('returns false when the serialized value is unchanged', () => {
    expect(shouldEmitChange('Hello world', 'Hello world')).toBe(false);
  });

  it('returns true when the serialized value differs', () => {
    expect(shouldEmitChange('Hello world!', 'Hello world')).toBe(true);
  });

  it('treats an undefined current value as empty string', () => {
    expect(shouldEmitChange('', undefined)).toBe(false);
    expect(shouldEmitChange('Hello', undefined)).toBe(true);
  });

  it('breaks the DCMS-307 selection-only-change loop', () => {
    // Plate's onChange fires on selection-only changes too (no document
    // mutation), which previously re-emitted the same markdown value on every
    // notification and caused an infinite store update loop (React #185).
    const currentValue = 'Some title body text.';
    const rerenderedSameValue = 'Some title body text.';
    expect(shouldEmitChange(rerenderedSameValue, currentValue)).toBe(false);
  });
});
