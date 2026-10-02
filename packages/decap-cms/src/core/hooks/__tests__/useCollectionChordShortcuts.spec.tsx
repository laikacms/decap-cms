import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCollectionChordShortcuts } from '@/core/hooks/useCollectionChordShortcuts';
import { getRegisteredShortcuts, resetShortcutsForTests } from '@/core/lib/shortcuts';

import type { CmsCollectionState } from '@/lib/util/index';

function col(name: string, label: string, shortcut?: string): CmsCollectionState {
  return { name, label, shortcut } as unknown as CmsCollectionState;
}

function registered(idPrefix: string) {
  return getRegisteredShortcuts().filter(s => s.id.startsWith(`${idPrefix}.`));
}

function keydown(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('useCollectionChordShortcuts', () => {
  beforeEach(() => resetShortcutsForTests());
  afterEach(() => resetShortcutsForTests());

  it('registers configured and positional chords with id, sequence, label and group', () => {
    const collections = [col('posts', 'Posts'), col('pages', 'Pages', 'P'), col('faq', 'FAQ')];
    renderHook(() => useCollectionChordShortcuts({ collections, idPrefix: 'nav', group: 'Navigation', go: vi.fn() }));

    expect(registered('nav').map(s => [s.id, s.sequence, s.label, s.group])).toEqual([
      ['nav.posts', 'g 1', 'Go to Posts', 'Navigation'],
      ['nav.pages', 'g p', 'Go to Pages', 'Navigation'],
      ['nav.faq', 'g 3', 'Go to FAQ', 'Navigation'],
    ]);
  });

  it('does not register the 10th+ collection without a configured shortcut', () => {
    const collections = Array.from({ length: 11 }, (_, i) => col(`c${i}`, `C${i}`));
    collections[10] = col('c10', 'C10', 'z');
    renderHook(() => useCollectionChordShortcuts({ collections, idPrefix: 'nav', group: 'Navigation', go: vi.fn() }));

    const ids = registered('nav').map(s => s.id);
    expect(ids).toContain('nav.c8');
    expect(ids).not.toContain('nav.c9');
    expect(ids).toContain('nav.c10');
    expect(ids).toHaveLength(10);
  });

  it('runs the latest go after rerender without re-registering', () => {
    const collections = [col('posts', 'Posts')];
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ go }) => useCollectionChordShortcuts({ collections, idPrefix: 'nav', group: 'Navigation', go }),
      { initialProps: { go: first } },
    );
    const before = registered('nav')[0];

    rerender({ go: second });

    expect(registered('nav')[0]).toBe(before);
    keydown('g');
    keydown('1');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(collections[0]);
  });

  it('disposes registrations on unmount', () => {
    const collections = [col('posts', 'Posts'), col('pages', 'Pages')];
    const { unmount } = renderHook(() =>
      useCollectionChordShortcuts({ collections, idPrefix: 'nav', group: 'Navigation', go: vi.fn() })
    );
    expect(registered('nav')).toHaveLength(2);

    unmount();

    expect(registered('nav')).toHaveLength(0);
  });

  it('disposes stale registrations and registers the new set when collections change', () => {
    const { rerender } = renderHook(
      ({ collections }) => useCollectionChordShortcuts({ collections, idPrefix: 'nav', group: 'Navigation', go: vi.fn() }),
      { initialProps: { collections: [col('posts', 'Posts'), col('pages', 'Pages')] } },
    );

    rerender({ collections: [col('news', 'News')] });

    expect(registered('nav').map(s => s.id)).toEqual(['nav.news']);
  });
});
