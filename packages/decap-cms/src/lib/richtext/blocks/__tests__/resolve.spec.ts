import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveBlocksForField } from '@/lib/richtext/blocks/resolve';

import type { BlockDefinition } from '@/lib/richtext/blocks/types';

const { getBlock, listBlocks } = vi.hoisted(() => ({
  getBlock: vi.fn(),
  listBlocks: vi.fn(),
}));

vi.mock('@/lib/richtext/blocks/registry', () => ({ getBlock, listBlocks }));

function block(id: string, overrides: Partial<BlockDefinition> = {}): BlockDefinition {
  return { id, fields: [], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveBlocksForField', () => {
  it('returns every registered block when the field has no allowlist', () => {
    const alpha = block('alpha');
    const beta = block('beta');
    listBlocks.mockReturnValue([alpha, beta]);

    const resolved = resolveBlocksForField({});

    expect(resolved).toEqual({ alpha, beta });
    expect(getBlock).not.toHaveBeenCalled();
  });

  it('returns every registered block when the field omits `blocks` entirely', () => {
    listBlocks.mockReturnValue([]);

    const resolved = resolveBlocksForField({ blocks: undefined });

    expect(resolved).toEqual({});
    expect(listBlocks).toHaveBeenCalledTimes(1);
  });

  it('filters to only the listed, registered ids when an allowlist is present', () => {
    const alpha = block('alpha');
    getBlock.mockImplementation((id: string) => (id === 'alpha' ? alpha : undefined));

    const resolved = resolveBlocksForField({ blocks: ['alpha'] });

    expect(resolved).toEqual({ alpha });
    expect(listBlocks).not.toHaveBeenCalled();
  });

  it('preserves allowlist order when building the resolved map', () => {
    const alpha = block('alpha');
    const beta = block('beta');
    getBlock.mockImplementation((id: string) => ({ alpha, beta }[id]));

    const resolved = resolveBlocksForField({ blocks: ['beta', 'alpha'] });

    expect(Object.keys(resolved)).toEqual(['beta', 'alpha']);
  });

  it('skips and warns for an unknown id in the allowlist', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getBlock.mockReturnValue(undefined);

    const resolved = resolveBlocksForField({ blocks: ['ghost'] });

    expect(resolved).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ghost'));
  });

  it('resolves known ids while skipping unknown ones in a mixed allowlist', () => {
    const alpha = block('alpha');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getBlock.mockImplementation((id: string) => (id === 'alpha' ? alpha : undefined));

    const resolved = resolveBlocksForField({ blocks: ['alpha', 'ghost'] });

    expect(resolved).toEqual({ alpha });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('treats an empty allowlist as no blocks resolved (not a fallback to all blocks)', () => {
    const resolved = resolveBlocksForField({ blocks: [] });

    expect(resolved).toEqual({});
    expect(listBlocks).not.toHaveBeenCalled();
    expect(getBlock).not.toHaveBeenCalled();
  });

  it('drops non-string entries from the allowlist before resolving', () => {
    const alpha = block('alpha');
    getBlock.mockImplementation((id: string) => (id === 'alpha' ? alpha : undefined));

    const resolved = resolveBlocksForField({ blocks: ['alpha', 42, null, undefined, { id: 'beta' }] as unknown[] });

    expect(resolved).toEqual({ alpha });
    expect(getBlock).toHaveBeenCalledTimes(1);
    expect(getBlock).toHaveBeenCalledWith('alpha');
  });

  it('treats a non-array `blocks` value as no allowlist and returns all registered blocks', () => {
    const alpha = block('alpha');
    listBlocks.mockReturnValue([alpha]);

    const resolved = resolveBlocksForField({ blocks: 'alpha' as unknown });

    expect(resolved).toEqual({ alpha });
    expect(getBlock).not.toHaveBeenCalled();
  });

  it('returns an empty object when no blocks are registered and there is no allowlist', () => {
    listBlocks.mockReturnValue([]);

    const resolved = resolveBlocksForField({});

    expect(resolved).toEqual({});
  });
});
