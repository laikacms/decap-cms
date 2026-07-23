import { useEffect, useRef, useState } from 'react';

import type { KeyboardEvent } from 'react';

export interface RovingTabIndexOptions {
  /** Number of focusable items in the grid. */
  itemCount: number;
  /** Number of columns the items are laid out in. */
  columns: number;
}

export interface RovingTabIndex {
  /** Index of the item that currently owns `tabIndex={0}`. */
  activeIndex: number;
  /** `tabIndex` to apply to the item at `index`. */
  getTabIndex: (index: number) => 0 | -1;
  /** Ref callback to register the DOM node for the item at `index`. */
  registerItem: (index: number) => (el: HTMLElement | null) => void;
  /** Marks `index` as active (e.g. on click/focus) without moving focus. */
  setActiveIndex: (index: number) => void;
  /** Arrow-key roving handler; attach to each item's `onKeyDown`. */
  onKeyDown: (event: KeyboardEvent, index: number) => void;
}

/**
 * Roving-tabindex keyboard navigation for a fixed-column grid of focusable
 * items (DCMS-1462). Only the active item has `tabIndex={0}` so `Tab` stops
 * on the grid once instead of visiting every item; arrow keys move the
 * active item (and DOM focus) by one cell/row, clamped at the grid edges.
 */
export function useRovingTabIndex({ itemCount, columns }: RovingTabIndexOptions): RovingTabIndex {
  const [activeIndex, setActiveIndexState] = useState(0);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    itemRefs.current.length = itemCount;
    if (activeIndex >= itemCount) {
      setActiveIndexState(itemCount > 0 ? itemCount - 1 : 0);
    }
  }, [itemCount, activeIndex]);

  const moveTo = (index: number) => {
    const clamped = Math.max(0, Math.min(itemCount - 1, index));
    setActiveIndexState(clamped);
    itemRefs.current[clamped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveTo(index + 1);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        moveTo(index - 1);
        return;
      case 'ArrowDown':
        event.preventDefault();
        moveTo(index + columns);
        return;
      case 'ArrowUp':
        event.preventDefault();
        moveTo(index - columns);
        return;
      default:
        return;
    }
  };

  return {
    activeIndex,
    getTabIndex: index => (index === activeIndex ? 0 : -1),
    registerItem: index => el => {
      itemRefs.current[index] = el;
    },
    setActiveIndex: setActiveIndexState,
    onKeyDown,
  };
}
