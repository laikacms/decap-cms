import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  collectBlockOwnCodecs,
  getBlock,
  hasBlock,
  listBlocks,
  registerBlock,
  RESERVED_BLOCK_TYPES,
  unregisterBlock,
} from '@/lib/richtext/blocks/registry';

import type { BlockDefinition, BlockFormatCodec } from '@/lib/richtext/blocks/types';

function block(id: string, overrides: Partial<BlockDefinition> = {}): BlockDefinition {
  return { id, fields: [], ...overrides };
}

function codec(tag: string): BlockFormatCodec {
  return {
    pattern: new RegExp(`^:${tag}:`),
    fromMatch: () => ({ tag }),
    serialize: data => `:${String(data.tag ?? tag)}:`,
  };
}

const registered: string[] = [];

function register(definition: BlockDefinition): void {
  registerBlock(definition);
  registered.push(definition.id);
}

afterEach(() => {
  while (registered.length > 0) unregisterBlock(registered.pop()!);
  vi.restoreAllMocks();
});

describe('block registry', () => {
  it('registers, looks up, and lists blocks in registration order', () => {
    register(block('alpha'));
    register(block('beta'));

    expect(hasBlock('alpha')).toBe(true);
    expect(getBlock('beta')?.id).toBe('beta');
    expect(listBlocks().map(definition => definition.id)).toEqual(['alpha', 'beta']);
  });

  it('replaces an earlier registration with the same id', () => {
    register(block('alpha', { label: 'first' }));
    registerBlock(block('alpha', { label: 'second' }));

    expect(getBlock('alpha')?.label).toBe('second');
    expect(listBlocks().filter(definition => definition.id === 'alpha')).toHaveLength(1);
  });

  it('rejects reserved Portable Text types', () => {
    for (const id of ['block', 'span', 'code', 'image', 'horizontal-rule', 'unknown']) {
      expect(RESERVED_BLOCK_TYPES.has(id)).toBe(true);
      expect(() => registerBlock(block(id))).toThrow(/reserved/);
    }
  });

  it('unregisters blocks', () => {
    register(block('alpha'));
    unregisterBlock('alpha');
    expect(hasBlock('alpha')).toBe(false);
    expect(getBlock('alpha')).toBeUndefined();
  });

  it('collects only well-formed codecs declared for the requested format', () => {
    register(
      block('shortcode', {
        formats: { markdown: codec('shortcode'), mdx: { name: 'Shortcode' } },
      }),
    );
    register(block('plain'));

    const markdown = collectBlockOwnCodecs('markdown');
    expect([...markdown.keys()]).toEqual(['shortcode']);

    // The mdx entry is a format-defined bag, not a codec.
    const mdx = collectBlockOwnCodecs('mdx');
    expect(mdx.size).toBe(0);
  });

  it('warns when a block is registered after codecs were consumed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    collectBlockOwnCodecs('markdown');
    register(block('late'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('registered after'));
  });

  // Pinning test (DCMS-1012): guards the documented public contract —
  // registerBlock/unregisterBlock/hasBlock/listBlocks — against silent drift.
  it('pins the documented registerBlock contract: rejects reserved ids and round-trips via hasBlock/listBlocks', () => {
    for (const id of RESERVED_BLOCK_TYPES) {
      expect(() => registerBlock(block(id))).toThrow(/reserved Portable Text type/);
      expect(hasBlock(id)).toBe(false);
    }

    expect(hasBlock('custom-block')).toBe(false);
    expect(listBlocks().some(definition => definition.id === 'custom-block')).toBe(false);

    register(block('custom-block', { label: 'Custom' }));

    expect(hasBlock('custom-block')).toBe(true);
    expect(listBlocks().some(definition => definition.id === 'custom-block')).toBe(true);

    unregisterBlock('custom-block');

    expect(hasBlock('custom-block')).toBe(false);
    expect(listBlocks().some(definition => definition.id === 'custom-block')).toBe(false);
  });
});
