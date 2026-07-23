/**
 * Unit tests for the lucide-icon widget's IconControl filter logic (LCMS-249).
 *
 * The `filter` prop (RegExp | function predicate) is passed via the Widget()
 * closure so Decap's fixed-prop rendering doesn't discard it. These tests
 * verify that icons excluded by the filter are absent from the filtered list.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { icons as lucideIcons } from 'lucide-react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type * as IconControlModule from '@/widgets/lucide-icon/IconControl';

vi.mock('@/widgets/lucide-icon/IconControl', () => ({ IconControl: () => null }));
vi.mock('@/widgets/lucide-icon/IconPreview', () => ({ IconPreview: () => null }));

const { default: WidgetIcon } = await import('@/widgets/lucide-icon/index');
const { IconControl } = await vi.importActual<typeof IconControlModule>(
  '@/widgets/lucide-icon/IconControl',
);

// Mirror the allIcons computation from IconControl.tsx
const allIcons = Object.fromEntries(Object.entries(lucideIcons));

// Mirror the filteredIcons computation from IconControl.tsx
function computeFilteredIcons(search: string, filter?: RegExp | ((id: string) => boolean)): string[] {
  return Object.keys(allIcons).filter(icon => {
    if (!icon.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter instanceof RegExp) return filter.test(icon);
    if (typeof filter === 'function') return filter(icon);
    return true;
  });
}

describe('WidgetIcon name (lucide-icon)', () => {
  it('registers as lucide-icon to avoid collision with radix-icon', () => {
    expect(WidgetIcon.name).toBe('lucide-icon');
    expect(WidgetIcon.Widget().name).toBe('lucide-icon');
  });
});

describe('IconControl filter logic (lucide-icon)', () => {
  it('includes all icons when no filter is supplied', () => {
    const icons = computeFilteredIcons('');
    expect(icons.length).toBe(Object.keys(allIcons).length);
  });

  it('excludes icons that do not match a RegExp filter', () => {
    // Only icons whose name starts with "A"
    const filter = /^A/;
    const icons = computeFilteredIcons('', filter);

    // Every returned icon must pass the filter
    for (const icon of icons) {
      expect(filter.test(icon)).toBe(true);
    }

    // At least one icon from the full set does NOT start with "A"; confirm it's absent
    const excluded = Object.keys(allIcons).filter(icon => !/^A/.test(icon));
    expect(excluded.length).toBeGreaterThan(0);
    for (const icon of excluded) {
      expect(icons).not.toContain(icon);
    }
  });

  it('excludes icons that do not match a function predicate filter', () => {
    const filter = (id: string) => id.startsWith('A');
    const icons = computeFilteredIcons('', filter);

    for (const icon of icons) {
      expect(icon.startsWith('A')).toBe(true);
    }

    const excluded = Object.keys(allIcons).filter(icon => !icon.startsWith('A'));
    expect(excluded.length).toBeGreaterThan(0);
    for (const icon of excluded) {
      expect(icons).not.toContain(icon);
    }
  });

  it('applies both filter and search simultaneously', () => {
    // Only arrow icons containing "up"
    const filter = /Arrow/;
    const search = 'up';
    const icons = computeFilteredIcons(search, filter);

    for (const icon of icons) {
      expect(filter.test(icon)).toBe(true);
      expect(icon.toLowerCase()).toContain(search.toLowerCase());
    }
  });

  it('returns empty list when filter excludes all icons', () => {
    const filter = /^ThisPatternMatchesNoLucideIcon_xyz123$/;
    const icons = computeFilteredIcons('', filter);
    expect(icons).toHaveLength(0);
  });
});

/**
 * Regression test for DCMS-1290: icon grid options were plain `<div>`s with
 * only `onClick`/`onMouseDown`, so keyboard-only users could never select an
 * icon once the grid was open.
 */
describe('IconControl keyboard operability (lucide-icon, DCMS-1290)', () => {
  const baseProps = {
    field: {} as never,
    classNameWrapper: '',
    setActiveStyle: () => {},
    setInactiveStyle: () => {},
    t: (key: string) => key,
    filter: /^Arrow/,
  };

  it('activates an icon option via Enter and calls onChange', () => {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    const option = screen.getAllByRole('button', { name: 'ArrowUp' })[0];
    fireEvent.keyDown(option, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('ArrowUp');
  });

  it('activates an icon option via Space and calls onChange', () => {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    const option = screen.getAllByRole('button', { name: 'ArrowDown' })[0];
    fireEvent.keyDown(option, { key: ' ' });

    expect(onChange).toHaveBeenCalledWith('ArrowDown');
  });

  it('exposes the initially-active icon option as focusable via tabIndex', () => {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    // First alphabetically among `/^Arrow/` matches, i.e. roving-tabindex's
    // default active cell (DCMS-1462).
    const option = screen.getAllByRole('button', { name: 'ArrowBigDown' })[0];
    expect(option.getAttribute('tabindex')).toBe('0');
  });
});

/**
 * Regression test for DCMS-1462: the Tab-only fix from DCMS-1290 left every
 * one of the ~1500 icons individually Tab-reachable. Roving tabindex should
 * move focus with the arrow keys within the 4-column grid while keeping only
 * one cell in the Tab order at a time.
 */
describe('IconControl arrow-key roving tabindex (lucide-icon, DCMS-1462)', () => {
  const baseProps = {
    field: {} as never,
    classNameWrapper: '',
    setActiveStyle: () => {},
    setInactiveStyle: () => {},
    t: (key: string) => key,
    filter: /^Arrow/,
  };

  // Search narrows the `/^Arrow/` filter to exactly the 8 "ArrowBig*" icons,
  // rendered in a 4-column grid (2 full rows), giving deterministic indices.
  const gridIconNames = [
    'ArrowBigDown',
    'ArrowBigDownDash',
    'ArrowBigLeft',
    'ArrowBigLeftDash',
    'ArrowBigRight',
    'ArrowBigRightDash',
    'ArrowBigUp',
    'ArrowBigUpDash',
  ];

  function renderNarrowedGrid() {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));
    fireEvent.change(screen.getByPlaceholderText('mediaLibrary.mediaLibraryModal.search'), {
      target: { value: 'ArrowBig' },
    });

    const options = gridIconNames.map(name => screen.getByRole('button', { name }));
    expect(options).toHaveLength(8);
    return options;
  }

  it('only the first cell is in the Tab order initially', () => {
    const options = renderNarrowedGrid();

    expect(options[0].getAttribute('tabindex')).toBe('0');
    for (const option of options.slice(1)) {
      expect(option.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('ArrowRight moves focus and tabindex to the next cell', () => {
    const options = renderNarrowedGrid();

    fireEvent.keyDown(options[0], { key: 'ArrowRight' });

    expect(options[1]).toHaveFocus();
    expect(options[1].getAttribute('tabindex')).toBe('0');
    expect(options[0].getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown moves focus by one full row (4 columns)', () => {
    const options = renderNarrowedGrid();

    fireEvent.keyDown(options[0], { key: 'ArrowDown' });

    expect(options[4]).toHaveFocus();
    expect(options[4].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowUp/ArrowLeft move focus back', () => {
    const options = renderNarrowedGrid();

    fireEvent.keyDown(options[0], { key: 'ArrowDown' });
    fireEvent.keyDown(options[4], { key: 'ArrowUp' });
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(options[0], { key: 'ArrowRight' });
    fireEvent.keyDown(options[1], { key: 'ArrowLeft' });
    expect(options[0]).toHaveFocus();
  });

  it('clamps at the grid edges instead of wrapping or leaving the grid', () => {
    const options = renderNarrowedGrid();

    fireEvent.keyDown(options[0], { key: 'ArrowLeft' });
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(options[7], { key: 'ArrowRight' });
    expect(options[7]).toHaveFocus();
  });

  it('Tab exits the grid after only one stop (single 0-tabindex cell)', () => {
    const options = renderNarrowedGrid();

    const tabbableCells = options.filter(option => option.getAttribute('tabindex') === '0');
    expect(tabbableCells).toHaveLength(1);
  });
});
