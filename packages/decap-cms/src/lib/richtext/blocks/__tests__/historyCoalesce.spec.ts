import { describe, expect, it } from 'vitest';

import {
  HISTORY_COALESCE_WINDOW_MS,
  shouldCoalesceHistoryEdit,
} from '@/lib/richtext/blocks/historyCoalesce';

describe('shouldCoalesceHistoryEdit (DCMS-1489)', () => {
  it('does not coalesce the first edit (no prior state)', () => {
    expect(shouldCoalesceHistoryEdit(null, 'block-1', 1_000)).toBe(false);
  });

  it('coalesces a rapid successive edit to the same node', () => {
    const last = { nodeKey: 'block-1', time: 1_000 };
    expect(shouldCoalesceHistoryEdit(last, 'block-1', 1_000 + 100)).toBe(true);
  });

  it('does not coalesce once the window has elapsed', () => {
    const last = { nodeKey: 'block-1', time: 1_000 };
    const now = 1_000 + HISTORY_COALESCE_WINDOW_MS;
    expect(shouldCoalesceHistoryEdit(last, 'block-1', now)).toBe(false);
  });

  it('does not coalesce an edit to a different node, even immediately after', () => {
    const last = { nodeKey: 'block-1', time: 1_000 };
    expect(shouldCoalesceHistoryEdit(last, 'block-2', 1_000 + 1)).toBe(false);
  });

  it('respects a custom window', () => {
    const last = { nodeKey: 'block-1', time: 1_000 };
    expect(shouldCoalesceHistoryEdit(last, 'block-1', 1_000 + 50, 100)).toBe(true);
    expect(shouldCoalesceHistoryEdit(last, 'block-1', 1_000 + 150, 100)).toBe(false);
  });
});
