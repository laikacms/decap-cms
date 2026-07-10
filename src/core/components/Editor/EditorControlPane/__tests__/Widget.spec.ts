import { describe, expect, it } from 'vitest';

import { isEmpty } from '../Widget';

/**
 * Regression test for DCMS-449: a whitespace-only string (e.g. "   ") has a
 * positive `.length`, so the required-field guard's raw `.length === 0`
 * check let it slip through as "not empty". That allowed Save to enable and
 * the entry to be silently discarded (never persisted, no error shown).
 */
describe('Widget isEmpty (DCMS-449)', () => {
  it('treats an empty string as empty', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('treats a whitespace-only string as empty', () => {
    expect(isEmpty('   ')).toBe(true);
  });

  it('treats a string of only tabs/newlines as empty', () => {
    expect(isEmpty('\t\n')).toBe(true);
  });

  it('treats a non-empty string as not empty', () => {
    expect(isEmpty('hello')).toBe(false);
  });

  it('treats a string with surrounding whitespace but real content as not empty', () => {
    expect(isEmpty('  hello  ')).toBe(false);
  });

  it('treats null as empty', () => {
    expect(isEmpty(null)).toBe(true);
  });

  it('treats undefined as empty', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('treats an empty array as empty', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('treats a non-empty array as not empty', () => {
    expect(isEmpty([1, 2, 3])).toBe(false);
  });

  it('treats an empty plain object as empty', () => {
    expect(isEmpty({})).toBe(true);
  });

  it('treats a non-empty plain object as not empty', () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it('treats a value with a zero .length property as empty', () => {
    expect(isEmpty({ length: 0 })).toBe(true);
  });

  it('treats a value with a positive .length property as not empty', () => {
    expect(isEmpty({ length: 3 })).toBe(false);
  });
});
