import { afterEach, describe, expect, it } from 'vitest';

import { getBlock, hasBlock } from '@/lib/richtext/blocks/registry';
import { getFormat, listFormats, registerFormat, resolveBlockCodecs, unregisterFormat } from '@/lib/richtext/formats';
import { getMapper, hasMapper } from '@/lib/richtext/registry';

import type { BlockDefinition, BlockFormatCodec } from '@/lib/richtext/blocks/types';
import type { FormatPack } from '@/lib/richtext/formats';
import type { Mapper } from '@/lib/richtext/types';

function fakeMapper(id: string): Mapper {
  return {
    id,
    toPortableText: () => [],
    fromPortableText: () => '',
    detect: () => 0,
  };
}

function block(id: string, overrides: Partial<BlockDefinition> = {}): BlockDefinition {
  return { id, fields: [], ...overrides };
}

function codec(output: string): BlockFormatCodec {
  return {
    pattern: /^!never-matches!/,
    fromMatch: () => ({}),
    serialize: () => output,
  };
}

const packs: string[] = [];

function register(pack: FormatPack): void {
  registerFormat(pack);
  packs.push(pack.id);
}

afterEach(() => {
  while (packs.length > 0) unregisterFormat(packs.pop()!);
});

describe('format packs', () => {
  it('registers a plain mapper and lists packs in registration order', () => {
    register({ id: 'fmt-a', mapper: fakeMapper('fmt-a') });
    register({ id: 'fmt-b', mapper: fakeMapper('fmt-b') });

    expect(hasMapper('fmt-a')).toBe(true);
    expect(getFormat('fmt-a')?.id).toBe('fmt-a');
    expect(listFormats().map(pack => pack.id)).toEqual(['fmt-a', 'fmt-b']);
  });

  it('resolves a mapper factory with a lazy codec resolver', () => {
    let seen: Map<string, BlockFormatCodec> | undefined;
    register({
      id: 'fmt-a',
      mapper: ({ resolveCodecs }) => ({
        ...fakeMapper('fmt-a'),
        fromPortableText: () => {
          seen = resolveCodecs();
          return '';
        },
      }),
    });

    // Registered AFTER the pack: the resolver must still see it (lazy).
    register({
      id: 'fmt-late',
      mapper: fakeMapper('fmt-late'),
      blocks: [block('late-block', { formats: { 'fmt-a': codec('late') } })],
    });

    // Trigger the resolver through the registered mapper.
    getMapper('fmt-a').fromPortableText([]);
    expect(seen && [...seen.keys()]).toEqual(['late-block']);
  });

  it('throws when a factory produces a mapper with a mismatched id', () => {
    expect(() => registerFormat({ id: 'fmt-a', mapper: () => fakeMapper('other') })).toThrow(
      /mismatched/,
    );
  });

  it('registers bundled blocks and removes them on unregisterFormat', () => {
    register({
      id: 'fmt-a',
      mapper: fakeMapper('fmt-a'),
      blocks: [block('bundled')],
    });
    expect(hasBlock('bundled')).toBe(true);

    unregisterFormat(packs.pop()!);
    expect(hasBlock('bundled')).toBe(false);
    expect(getFormat('fmt-a')).toBeUndefined();
    expect(hasMapper('fmt-a')).toBe(false);
  });

  it("a block's own codec wins over the pack's per-block override", () => {
    register({
      id: 'fmt-a',
      mapper: fakeMapper('fmt-a'),
      blocks: [
        block('mine', { formats: { 'fmt-a': codec('from-block') } }),
        block('theirs'),
      ],
      blockSupport: {
        codecs: {
          mine: codec('from-pack'),
          theirs: codec('pack-only'),
        },
      },
    });

    const codecs = resolveBlockCodecs('fmt-a');
    expect(codecs.get('mine')?.serialize({})).toBe('from-block');
    expect(codecs.get('theirs')?.serialize({})).toBe('pack-only');
    expect(getBlock('mine')).toBeDefined();
  });
});
