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

  it('moves focus with arrow keys while keeping a single grid tab stop', async () => {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    const options = await waitFor(() => {
      const iconOptions = screen.getAllByRole('button').filter(option => option.title.startsWith('Arrow'));
      expect(iconOptions.length).toBeGreaterThan(5);
      return iconOptions;
    });
    expect(options.filter(option => option.tabIndex === 0)).toHaveLength(1);

    const first = options.find(option => option.tabIndex === 0) as HTMLElement;
    const firstIndex = options.indexOf(first);
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });

    expect(options[firstIndex + 1]).toHaveFocus();
    expect(options[firstIndex + 1]).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(options[firstIndex + 1], { key: 'ArrowDown' });
    expect(options[firstIndex + 5]).toHaveFocus();
  });
});
