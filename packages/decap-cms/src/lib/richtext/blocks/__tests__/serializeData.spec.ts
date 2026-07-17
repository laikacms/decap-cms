import { describe, expect, it } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { normalizeBlockData } from '@/lib/richtext/blocks/serializeData';
import { registerMapper } from '@/lib/richtext/registry';
import { RichtextValue } from '@/lib/richtext/RichtextValue';

registerMapper(markdownMapper);

describe('normalizeBlockData', () => {
  it('unwraps a nested RichtextValue to its canonical Portable Text', () => {
    const nested = new RichtextValue('hello world');
    const data = { caption: nested };

    const normalized = normalizeBlockData(data);

    expect(normalized.caption).toEqual(nested.portableText);
    expect(normalized.caption).not.toBeInstanceOf(RichtextValue);
  });

  it('drops undefined and function-typed entries from objects', () => {
    const data = {
      a: 1,
      b: undefined,
      c: () => 'noop',
      d: 'kept',
    };

    const normalized = normalizeBlockData(data);

    expect(normalized).toEqual({ a: 1, d: 'kept' });
    expect('b' in normalized).toBe(false);
    expect('c' in normalized).toBe(false);
  });

  it('drops undefined and function-typed entries from arrays', () => {
    const data = {
      list: [1, undefined, () => 'noop', 'kept', 2],
    };

    const normalized = normalizeBlockData(data);

    expect(normalized.list).toEqual([1, 'kept', 2]);
  });

  it('passes plain primitives through unchanged', () => {
    const data = {
      str: 'text',
      num: 42,
      bool: true,
      nil: null,
    };

    const normalized = normalizeBlockData(data);

    expect(normalized).toEqual(data);
  });

  it('passes nested plain objects and arrays through unchanged (deep clone, not identity)', () => {
    const data = {
      nested: {
        list: [1, 2, { deep: 'value' }],
        obj: { x: 1, y: 2 },
      },
    };

    const normalized = normalizeBlockData(data);

    expect(normalized).toEqual(data);
  });

  it('recursively normalizes nested objects and arrays, dropping undefined/functions at every level', () => {
    const nested = new RichtextValue('nested content');
    const data = {
      block: {
        items: [
          { title: 'first', skip: undefined },
          { title: 'second', fn: () => 'noop' },
        ],
        richtext: nested,
        extra: undefined,
      },
    };

    const normalized = normalizeBlockData(data) as any;

    expect(normalized.block.items).toEqual([{ title: 'first' }, { title: 'second' }]);
    expect(normalized.block.richtext).toEqual(nested.portableText);
    expect('extra' in normalized.block).toBe(false);
  });
});
