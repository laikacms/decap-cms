/**
 * Unit tests for the radix-icon widget's IconControl filter logic (LCMS-249).
 *
 * The `filter` prop (RegExp | function predicate) is passed via the Widget()
 * closure so Decap's fixed-prop rendering doesn't discard it. These tests
 * verify that icons excluded by the filter are absent from the filtered list.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type * as IconControlModule from '@/widgets/radix-icon/IconControl';

vi.mock('@/widgets/radix-icon/IconControl', () => ({ IconControl: () => null }));
vi.mock('@/widgets/radix-icon/IconPreview', () => ({ IconPreview: () => null }));

const { default: WidgetIcon } = await import('@/widgets/radix-icon/index');
const { IconControl } = await vi.importActual<typeof IconControlModule>(
  '@/widgets/radix-icon/IconControl',
);

// Radix icons are loaded asynchronously in the real control; here we replicate
// the filter computation over a representative set to keep tests synchronous
// and dependency-free.
const SAMPLE_ICONS: Record<string, true> = {
  AccessibilityIcon: true,
  ActivityLogIcon: true,
  AlignBottomIcon: true,
  AlignCenterHorizontallyIcon: true,
  ArrowDownIcon: true,
  ArrowLeftIcon: true,
  ArrowRightIcon: true,
  ArrowTopRightIcon: true,
  ArrowUpIcon: true,
  BackpackIcon: true,
  BorderAllIcon: true,
  BoxIcon: true,
  CalendarIcon: true,
  CheckIcon: true,
  ChevronDownIcon: true,
  ChevronUpIcon: true,
  CrossCircledIcon: true,
  CursorArrowIcon: true,
};

// Mirror the icons computation from IconControl.tsx
function computeIcons(
  allIcons: Record<string, unknown>,
  search: string,
  filter?: RegExp | ((id: string) => boolean),
): string[] {
  return Object.keys(allIcons).filter(iconName => {
    if (!iconName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter instanceof RegExp) return filter.test(iconName);
    if (typeof filter === 'function') return filter(iconName);
    return true;
  });
}

describe('WidgetIcon name (radix-icon)', () => {
  it('registers as radix-icon to avoid collision with lucide-icon', () => {
    expect(WidgetIcon.name).toBe('radix-icon');
    expect(WidgetIcon.Widget().name).toBe('radix-icon');
  });
});

describe('IconControl filter logic (radix-icon)', () => {
  it('includes all icons when no filter is supplied', () => {
    const icons = computeIcons(SAMPLE_ICONS, '');
    expect(icons).toHaveLength(Object.keys(SAMPLE_ICONS).length);
  });

  it('excludes icons that do not match a RegExp filter', () => {
    // Only icons whose name starts with "Arrow"
    const filter = /^Arrow/;
    const icons = computeIcons(SAMPLE_ICONS, '', filter);

    // Every returned icon must pass the filter
    for (const icon of icons) {
      expect(filter.test(icon)).toBe(true);
    }

    // Icons that don't start with "Arrow" must be absent
    const excluded = Object.keys(SAMPLE_ICONS).filter(icon => !/^Arrow/.test(icon));
    expect(excluded.length).toBeGreaterThan(0);
    for (const icon of excluded) {
      expect(icons).not.toContain(icon);
    }
  });

  it('excludes icons that do not match a function predicate filter', () => {
    const filter = (id: string) => id.startsWith('Arrow');
    const icons = computeIcons(SAMPLE_ICONS, '', filter);

    for (const icon of icons) {
      expect(icon.startsWith('Arrow')).toBe(true);
    }

    const excluded = Object.keys(SAMPLE_ICONS).filter(icon => !icon.startsWith('Arrow'));
    expect(excluded.length).toBeGreaterThan(0);
    for (const icon of excluded) {
      expect(icons).not.toContain(icon);
    }
  });

  it('applies both filter and search simultaneously', () => {
    // Only Chevron icons that contain "down"
    const filter = /Chevron/;
    const search = 'down';
    const icons = computeIcons(SAMPLE_ICONS, search, filter);

    expect(icons).toEqual(['ChevronDownIcon']);
    for (const icon of icons) {
      expect(filter.test(icon)).toBe(true);
      expect(icon.toLowerCase()).toContain(search.toLowerCase());
    }
  });

  it('returns empty list when filter excludes all icons', () => {
    const filter = /^ThisPatternMatchesNoRadixIcon_xyz123$/;
    const icons = computeIcons(SAMPLE_ICONS, '', filter);
    expect(icons).toHaveLength(0);
  });
});

/**
 * Regression test for DCMS-1290: icon grid options were plain `<div>`s with
 * only `onClick`/`onMouseDown`, so keyboard-only users could never select an
 * icon once the grid was open.
 */
describe('IconControl keyboard operability (radix-icon, DCMS-1290)', () => {
  const baseProps = {
    field: {} as never,
    classNameWrapper: '',
    setActiveStyle: () => {},
    setInactiveStyle: () => {},
    t: (key: string) => key,
    filter: /^Arrow/,
  };

  it('activates an icon option via Enter and calls onChange', async () => {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    const option = await waitFor(() => screen.getAllByRole('button', { name: 'ArrowUpIcon' })[0]);
    fireEvent.keyDown(option, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('ArrowUpIcon');
  });

  it('activates an icon option via Space and calls onChange', async () => {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    const option = await waitFor(() => screen.getAllByRole('button', { name: 'ArrowDownIcon' })[0]);
    fireEvent.keyDown(option, { key: ' ' });

    expect(onChange).toHaveBeenCalledWith('ArrowDownIcon');
  });

  it('exposes the initially-active icon option as focusable via tabIndex', async () => {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    // First alphabetically among `/^Arrow/` matches, i.e. roving-tabindex's
    // default active cell (DCMS-1462).
    const option = await waitFor(() => screen.getAllByRole('button', { name: 'ArrowBottomLeftIcon' })[0]);
    expect(option.getAttribute('tabindex')).toBe('0');
  });
});

/**
 * Regression test for DCMS-1462: the Tab-only fix from DCMS-1290 left every
 * one of the ~1500 icons individually Tab-reachable. Roving tabindex should
 * move focus with the arrow keys within the 4-column grid while keeping only
 * one cell in the Tab order at a time.
 */
describe('IconControl arrow-key roving tabindex (radix-icon, DCMS-1462)', () => {
  const baseProps = {
    field: {} as never,
    classNameWrapper: '',
    setActiveStyle: () => {},
    setInactiveStyle: () => {},
    t: (key: string) => key,
    filter: /^Arrow/,
  };

  // The real `@radix-ui/react-icons` package exposes exactly 8 "Arrow*Icon"
  // names, rendered in a 4-column grid (2 full rows), giving deterministic
  // indices without narrowing further via the search box.
  const gridIconNames = [
    'ArrowBottomLeftIcon',
    'ArrowBottomRightIcon',
    'ArrowDownIcon',
    'ArrowLeftIcon',
    'ArrowRightIcon',
    'ArrowTopLeftIcon',
    'ArrowTopRightIcon',
    'ArrowUpIcon',
  ];

  async function renderGrid() {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    const options = await waitFor(() => gridIconNames.map(name => screen.getByRole('button', { name })));
    expect(options).toHaveLength(8);
    return options;
  }

  it('only the first cell is in the Tab order initially', async () => {
    const options = await renderGrid();

    expect(options[0].getAttribute('tabindex')).toBe('0');
    for (const option of options.slice(1)) {
      expect(option.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('ArrowRight moves focus and tabindex to the next cell', async () => {
    const options = await renderGrid();

    fireEvent.keyDown(options[0], { key: 'ArrowRight' });

    expect(options[1]).toHaveFocus();
    expect(options[1].getAttribute('tabindex')).toBe('0');
    expect(options[0].getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown moves focus by one full row (4 columns)', async () => {
    const options = await renderGrid();

    fireEvent.keyDown(options[0], { key: 'ArrowDown' });

    expect(options[4]).toHaveFocus();
    expect(options[4].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowUp/ArrowLeft move focus back', async () => {
    const options = await renderGrid();

    fireEvent.keyDown(options[0], { key: 'ArrowDown' });
    fireEvent.keyDown(options[4], { key: 'ArrowUp' });
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(options[0], { key: 'ArrowRight' });
    fireEvent.keyDown(options[1], { key: 'ArrowLeft' });
    expect(options[0]).toHaveFocus();
  });

  it('clamps at the grid edges instead of wrapping or leaving the grid', async () => {
    const options = await renderGrid();

    fireEvent.keyDown(options[0], { key: 'ArrowLeft' });
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(options[7], { key: 'ArrowRight' });
    expect(options[7]).toHaveFocus();
  });

  it('Tab exits the grid after only one stop (single 0-tabindex cell)', async () => {
    const options = await renderGrid();

    const tabbableCells = options.filter(option => option.getAttribute('tabindex') === '0');
    expect(tabbableCells).toHaveLength(1);
  });
});
