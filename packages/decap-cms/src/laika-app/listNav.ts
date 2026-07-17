/**
 * Focus movement for the laika shell's item surfaces (entry cards, media
 * cards, workflow cards, dashboard cards, sidebar links).
 *
 * Two cooperating mechanisms:
 * - Cards opt in by carrying NAV_ITEM_ATTRIBUTE. `j` / `k` (registered in
 *   LaikaShortcuts) walk them in DOM order from anywhere on the page, and
 *   `handleNavItemKeyDown` gives a focused card arrow-key movement,
 *   including geometric up/down for grids.
 * - `moveFocusWithinContainer` is a scoped variant for the sidebar, where
 *   the focusable set is "links inside this container" rather than tagged
 *   cards.
 *
 * All helpers work on the live DOM instead of React state on purpose: the
 * cards are rendered by different slots (core's EntryListing, the media
 * library modal, the dashboard) with no common React parent to coordinate
 * through, and hosts adding their own cards only need the data attribute.
 */

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

export const NAV_ITEM_ATTRIBUTE = 'data-laika-nav-item';

/** Props to spread onto a focusable card so j/k and arrow keys pick it up. */
export const navItemProps = {
  [NAV_ITEM_ATTRIBUTE]: 'true',
} as const;

export function getNavItems(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${NAV_ITEM_ATTRIBUTE}]`));
}

/**
 * Items are walked within the nearest modal (media library cards stay
 * inside their dialog) or, outside any modal, across the whole page.
 */
function navScopeOf(element: Element | null): ParentNode {
  return element?.closest('[role="dialog"], [aria-modal="true"], dialog') ?? document;
}

function focusItem(item: HTMLElement | undefined): boolean {
  if (!item) return false;
  item.focus();
  return true;
}

/**
 * Moves focus to the next/previous nav item in DOM order, starting from the
 * item that has (or contains) focus; with focus elsewhere, `+1` enters the
 * list at the first item and `-1` at the last.
 */
export function focusSiblingNavItem(delta: 1 | -1): boolean {
  const active = document.activeElement;
  const items = getNavItems(navScopeOf(active));
  if (items.length === 0) return false;
  const currentIndex = active instanceof Element
    ? items.findIndex(item => item === active || item.contains(active))
    : -1;
  if (currentIndex === -1) {
    return focusItem(delta === 1 ? items[0] : items[items.length - 1]);
  }
  const next = items[currentIndex + delta];
  return focusItem(next);
}

/**
 * Geometric up/down for grids: the closest item on the nearest row above /
 * below, preferring horizontal alignment. Falls back to DOM-order stepping
 * when layout gives no signal (single column, jsdom).
 */
function focusVerticalNavItem(current: HTMLElement, delta: 1 | -1): boolean {
  const items = getNavItems(navScopeOf(current));
  const currentRect = current.getBoundingClientRect();
  let best: { item: HTMLElement, rowDistance: number, columnDistance: number } | undefined;
  for (const item of items) {
    if (item === current) continue;
    const rect = item.getBoundingClientRect();
    const rowDistance = (rect.top - currentRect.top) * delta;
    if (rowDistance <= 0) continue;
    const columnDistance = Math.abs(rect.left - currentRect.left);
    if (
      !best
      || rowDistance < best.rowDistance
      || (rowDistance === best.rowDistance && columnDistance < best.columnDistance)
    ) {
      best = { item, rowDistance, columnDistance };
    }
  }
  if (best) return focusItem(best.item);
  return focusSiblingNavItem(delta);
}

/**
 * KeyDown handler for a focusable card carrying NAV_ITEM_ATTRIBUTE:
 * arrows move between cards (geometrically for up/down), Home/End jump to
 * the ends. Returns without side effects for unrelated keys.
 */
export function handleNavItemKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
  const current = event.currentTarget;
  let handled: boolean;
  switch (event.key) {
    case 'ArrowRight':
      handled = focusSiblingNavItem(1);
      break;
    case 'ArrowLeft':
      handled = focusSiblingNavItem(-1);
      break;
    case 'ArrowDown':
      handled = focusVerticalNavItem(current, 1);
      break;
    case 'ArrowUp':
      handled = focusVerticalNavItem(current, -1);
      break;
    case 'Home':
      handled = focusItem(getNavItems(navScopeOf(current))[0]);
      break;
    case 'End': {
      const items = getNavItems(navScopeOf(current));
      handled = focusItem(items[items.length - 1]);
      break;
    }
    default:
      return;
  }
  if (handled) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/**
 * Scoped ArrowUp/ArrowDown focus movement over `selector` matches inside
 * `container` (the sidebar's link list). Returns true when it moved focus.
 */
export function moveFocusWithinContainer(
  container: HTMLElement,
  selector: string,
  delta: 1 | -1,
): boolean {
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
  if (items.length === 0) return false;
  const active = document.activeElement;
  const currentIndex = active instanceof Element ? items.findIndex(item => item === active) : -1;
  if (currentIndex === -1) {
    return focusItem(delta === 1 ? items[0] : items[items.length - 1]);
  }
  return focusItem(items[currentIndex + delta]);
}
