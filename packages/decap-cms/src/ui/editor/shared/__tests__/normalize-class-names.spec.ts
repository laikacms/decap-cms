// @vitest-environment node
import { describe, expect, it } from 'vitest';

import normalizeClassNames from '@/ui/editor/shared/normalize-class-names';

describe('normalizeClassNames', () => {
  it('returns an empty array when called without arguments', () => {
    expect(normalizeClassNames()).toEqual([]);
  });

  it('returns a single class name as-is', () => {
    expect(normalizeClassNames('foo')).toEqual(['foo']);
  });

  it('flattens multiple string arguments in order', () => {
    expect(normalizeClassNames('foo', 'bar', 'baz')).toEqual(['foo', 'bar', 'baz']);
  });

  it('drops undefined, false, null and empty-string values', () => {
    expect(normalizeClassNames(undefined, false, null, '', 'foo')).toEqual(['foo']);
  });

  it('returns an empty array when every value is falsy', () => {
    expect(normalizeClassNames(undefined, false, null, '')).toEqual([]);
  });

  it('drops true because it is not a string', () => {
    expect(normalizeClassNames(true, 'foo')).toEqual(['foo']);
  });

  it('splits whitespace-separated tokens within one argument', () => {
    expect(normalizeClassNames('foo bar  baz')).toEqual(['foo', 'bar', 'baz']);
  });

  it('trims leading/trailing whitespace and handles tabs and newlines', () => {
    expect(normalizeClassNames('  foo\tbar\nbaz  ')).toEqual(['foo', 'bar', 'baz']);
  });

  it('drops whitespace-only strings', () => {
    expect(normalizeClassNames('   ', 'foo')).toEqual(['foo']);
  });

  it('does not deduplicate repeated tokens', () => {
    expect(normalizeClassNames('foo', 'foo bar', 'bar')).toEqual(['foo', 'foo', 'bar', 'bar']);
  });
});
