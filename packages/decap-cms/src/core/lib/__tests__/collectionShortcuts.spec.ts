import { describe, expect, it } from 'vitest';

import { collectionChordKeys } from '../collectionShortcuts';

import type { CmsCollectionState } from '@/lib/util/index';

function col(name: string, shortcut?: unknown): CmsCollectionState {
  return { name, shortcut } as unknown as CmsCollectionState;
}

describe('collectionChordKeys', () => {
  it('returns an empty Map for empty input', () => {
    expect(collectionChordKeys([])).toEqual(new Map());
  });

  it('uses and lowercases a configured single-char shortcut', () => {
    const keys = collectionChordKeys([col('posts', 'M'), col('pages', '7')]);
    expect(keys.get('posts')).toBe('m');
    expect(keys.get('pages')).toBe('7');
  });

  it.each([['ab'], ['!'], [''], [5], [null], [{}]])(
    'falls back to 1-based position for invalid shortcut %j',
    shortcut => {
      const keys = collectionChordKeys([col('a'), col('b', shortcut)]);
      expect(keys.get('b')).toBe('2');
    },
  );

  it('falls back to position when no shortcut is configured', () => {
    const keys = collectionChordKeys([col('a'), col('b'), col('c')]);
    expect([...keys]).toEqual([['a', '1'], ['b', '2'], ['c', '3']]);
  });

  it('gives no entry at index >= 9 without a valid shortcut', () => {
    const cols = Array.from({ length: 11 }, (_, i) => col(`c${i}`));
    const keys = collectionChordKeys(cols);
    expect(keys.get('c8')).toBe('9');
    expect(keys.has('c9')).toBe(false);
    expect(keys.has('c10')).toBe(false);
    expect(keys.size).toBe(9);
  });

  it('gives an entry at index >= 9 with a valid shortcut', () => {
    const cols = Array.from({ length: 10 }, (_, i) => col(`c${i}`, i === 9 ? 'Z' : undefined));
    expect(collectionChordKeys(cols).get('c9')).toBe('z');
  });

  it('counts a configured collection toward positional index', () => {
    const keys = collectionChordKeys([col('a', 'x'), col('b'), col('c')]);
    expect(keys.get('a')).toBe('x');
    expect(keys.get('b')).toBe('2');
    expect(keys.get('c')).toBe('3');
  });
});
