import { afterEach, describe, expect, it } from 'vitest';

import { getMapper, hasMapper, listMappers, registerMapper, unregisterMapper } from '@/lib/richtext/registry';

import type { Mapper } from '@/lib/richtext/types';

function makeMapper(id: string): Mapper {
  return {
    id,
    toPortableText: () => [],
    fromPortableText: () => '',
    detect: () => 0,
  };
}

describe('richtext mapper registry', () => {
  const registeredIds: string[] = [];

  function register(mapper: Mapper): void {
    registeredIds.push(mapper.id);
    registerMapper(mapper);
  }

  afterEach(() => {
    while (registeredIds.length > 0) {
      unregisterMapper(registeredIds.pop()!);
    }
  });

  it('hasMapper returns false for an id that was never registered', () => {
    expect(hasMapper('test-mapper-never-registered')).toBe(false);
  });

  it('getMapper throws for an unknown id, listing the currently-registered ids', () => {
    register(makeMapper('test-mapper-known-a'));
    register(makeMapper('test-mapper-known-b'));

    expect(() => getMapper('test-mapper-unknown')).toThrow(
      /test-mapper-known-a.*test-mapper-known-b|test-mapper-known-b.*test-mapper-known-a/s,
    );

    try {
      getMapper('test-mapper-unknown');
      throw new Error('expected getMapper to throw');
    } catch (error) {
      expect(String(error)).toContain('test-mapper-known-a');
      expect(String(error)).toContain('test-mapper-known-b');
    }
  });

  it('unregisterMapper removes an id so hasMapper/getMapper reflect the removal', () => {
    const mapper = makeMapper('test-mapper-removable');
    register(mapper);
    expect(hasMapper('test-mapper-removable')).toBe(true);
    expect(getMapper('test-mapper-removable')).toBe(mapper);

    unregisterMapper('test-mapper-removable');
    registeredIds.pop();

    expect(hasMapper('test-mapper-removable')).toBe(false);
    expect(() => getMapper('test-mapper-removable')).toThrow(/no mapper registered/);
  });

  it('registerMapper called again with the same id replaces the earlier mapper', () => {
    const first = makeMapper('test-mapper-replaceable');
    const second = makeMapper('test-mapper-replaceable');
    register(first);
    expect(getMapper('test-mapper-replaceable')).toBe(first);

    registerMapper(second);
    expect(getMapper('test-mapper-replaceable')).toBe(second);
    expect(getMapper('test-mapper-replaceable')).not.toBe(first);
  });

  it('listMappers returns mappers in registration order', () => {
    const before = listMappers();

    const first = makeMapper('test-mapper-order-1');
    const second = makeMapper('test-mapper-order-2');
    const third = makeMapper('test-mapper-order-3');
    register(first);
    register(second);
    register(third);

    const added = listMappers().slice(before.length);
    expect(added).toEqual([first, second, third]);
  });
});
