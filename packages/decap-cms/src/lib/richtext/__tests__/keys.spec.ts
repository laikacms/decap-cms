import { describe, expect, it } from 'vitest';

import { createKeyGenerator, stripKeys } from '@/lib/richtext/keys';

describe('createKeyGenerator', () => {
  it('produces sequential deterministic keys with the given prefix', () => {
    const nextKey = createKeyGenerator('p');
    expect(nextKey()).toBe('p0');
    expect(nextKey()).toBe('p1');
    expect(nextKey()).toBe('p2');
  });

  it('does not share counters between independent generators', () => {
    const genA = createKeyGenerator('a');
    const genB = createKeyGenerator('b');

    expect(genA()).toBe('a0');
    expect(genB()).toBe('b0');
    expect(genA()).toBe('a1');
    expect(genB()).toBe('b1');
    expect(genA()).toBe('a2');
  });
});

describe('stripKeys', () => {
  it('removes _key from a top-level object', () => {
    expect(stripKeys({ _key: 'k0', _type: 'span', text: 'hi' })).toEqual({
      _type: 'span',
      text: 'hi',
    });
  });

  it('removes _key at every nesting level, including arrays', () => {
    const input = [
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'span', _key: 's0', text: 'Hi ', marks: [] },
          { _type: 'badge', _key: 's1', label: 'new' },
        ],
      },
    ];

    expect(stripKeys(input)).toEqual([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Hi ', marks: [] },
          { _type: 'badge', label: 'new' },
        ],
      },
    ]);
  });

  it('leaves other keys and values untouched', () => {
    const input = { _type: 'span', _key: 'k0', text: 'hello', count: 3, flag: true, nil: null };
    expect(stripKeys(input)).toEqual({
      _type: 'span',
      text: 'hello',
      count: 3,
      flag: true,
      nil: null,
    });
  });

  it('no-ops on primitives', () => {
    expect(stripKeys('hello')).toBe('hello');
    expect(stripKeys(42)).toBe(42);
    expect(stripKeys(true)).toBe(true);
    expect(stripKeys(null)).toBe(null);
    expect(stripKeys(undefined)).toBe(undefined);
  });
});
