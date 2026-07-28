import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRovingIconFocus } from '@/widgets/icon-picker/useRovingIconFocus';

import type React from 'react';

const ICON_NAMES = ['icon-0', 'icon-1', 'icon-2', 'icon-3', 'icon-4', 'icon-5', 'icon-6'];

function makeKeyEvent(key: string, currentIndex: number, focusables: HTMLElement[]) {
  const parentElement = { children: focusables } as unknown as HTMLElement;
  const currentTarget = { parentElement } as unknown as HTMLElement;
  return {
    key,
    currentTarget,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLElement>;
}

function makeFocusables(count: number) {
  return Array.from({ length: count }, () => ({ focus: vi.fn() }) as unknown as HTMLElement);
}

describe('useRovingIconFocus', () => {
  describe('rovingIconName selection', () => {
    it('falls back to the first icon when nothing is focused or selected', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      expect(result.current.rovingIconName).toBe('icon-0');
    });

    it('falls back to the selected icon when nothing is focused', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES, 'icon-3'));
      expect(result.current.rovingIconName).toBe('icon-3');
    });

    it('ignores a selected icon that is not in the icon list', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES, 'not-a-real-icon'));
      expect(result.current.rovingIconName).toBe('icon-0');
    });

    it('prefers the focused icon over the selected icon', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES, 'icon-3'));
      act(() => {
        result.current.onIconFocus('icon-5');
      });
      expect(result.current.rovingIconName).toBe('icon-5');
    });

    it('falls back past a stale focused icon that has left the icon list', () => {
      const { result, rerender } = renderHook(
        ({ icons, selected }: { icons: string[]; selected?: string }) =>
          useRovingIconFocus(icons, selected),
        { initialProps: { icons: ICON_NAMES, selected: 'icon-3' } },
      );
      act(() => {
        result.current.onIconFocus('icon-5');
      });
      expect(result.current.rovingIconName).toBe('icon-5');

      rerender({ icons: ICON_NAMES.filter(name => name !== 'icon-5'), selected: 'icon-3' });
      expect(result.current.rovingIconName).toBe('icon-3');
    });
  });

  describe('arrow key offset math', () => {
    it('moves right one index on ArrowRight', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowRight', 2, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, 2);
      });

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(focusables[3].focus).toHaveBeenCalledTimes(1);
      expect(result.current.rovingIconName).toBe('icon-3');
    });

    it('moves left one index on ArrowLeft', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowLeft', 2, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, 2);
      });

      expect(focusables[1].focus).toHaveBeenCalledTimes(1);
      expect(result.current.rovingIconName).toBe('icon-1');
    });

    it('jumps back a full row (GRID_COLUMN_COUNT = 4) on ArrowUp', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowUp', 5, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, 5);
      });

      expect(focusables[1].focus).toHaveBeenCalledTimes(1);
      expect(result.current.rovingIconName).toBe('icon-1');
    });

    it('jumps forward a full row (GRID_COLUMN_COUNT = 4) on ArrowDown', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowDown', 1, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, 1);
      });

      expect(focusables[5].focus).toHaveBeenCalledTimes(1);
      expect(result.current.rovingIconName).toBe('icon-5');
    });

    it('ignores non-arrow keys and does not call preventDefault', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('Enter', 2, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, 2);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(focusables.some(f => (f.focus as ReturnType<typeof vi.fn>).mock.calls.length > 0)).toBe(
        false,
      );
      expect(result.current.rovingIconName).toBe('icon-0');
    });
  });

  describe('index clamping at array bounds', () => {
    it('clamps at the lower bound: ArrowLeft on the first icon stays at index 0', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowLeft', 0, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, 0);
      });

      expect(focusables[0].focus).toHaveBeenCalledTimes(1);
      expect(result.current.rovingIconName).toBe('icon-0');
    });

    it('clamps at the lower bound: ArrowUp on the first row stays within range', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowUp', 1, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, 1);
      });

      expect(focusables[0].focus).toHaveBeenCalledTimes(1);
      expect(result.current.rovingIconName).toBe('icon-0');
    });

    it('clamps at the upper bound: ArrowRight on the last icon stays at the last index', () => {
      const lastIndex = ICON_NAMES.length - 1;
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowRight', lastIndex, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, lastIndex);
      });

      expect(focusables[lastIndex].focus).toHaveBeenCalledTimes(1);
      expect(result.current.rovingIconName).toBe(ICON_NAMES[lastIndex]);
    });

    it('clamps at the upper bound: ArrowDown on the last row stays within range', () => {
      const lastIndex = ICON_NAMES.length - 1;
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowDown', lastIndex, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, lastIndex);
      });

      expect(focusables[lastIndex].focus).toHaveBeenCalledTimes(1);
      expect(result.current.rovingIconName).toBe(ICON_NAMES[lastIndex]);
    });

    it('never accesses an out-of-range element when clamped', () => {
      const { result } = renderHook(() => useRovingIconFocus(ICON_NAMES));
      const focusables = makeFocusables(ICON_NAMES.length);
      const event = makeKeyEvent('ArrowLeft', 0, focusables);

      act(() => {
        result.current.onArrowKeyDown(event, 0);
      });

      expect(focusables[-1]).toBeUndefined();
      expect(result.current.rovingIconName).toBe('icon-0');
    });
  });
});
