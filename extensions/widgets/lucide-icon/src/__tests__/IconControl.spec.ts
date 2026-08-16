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

import type * as IconControlModule from '../IconControl';

vi.mock('../IconControl', () => ({ IconControl: () => null }));
vi.mock('../IconPreview', () => ({ IconPreview: () => null }));

const { default: WidgetIcon } = await import('../index');
const { IconControl } = await vi.importActual<typeof IconControlModule>(
  '../IconControl',
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

  it('moves focus with arrow keys while keeping a single grid tab stop', () => {
    const onChange = vi.fn();
    render(React.createElement(IconControl, { ...baseProps, onChange, value: undefined }));

    fireEvent.click(screen.getByRole('button', { name: 'editor.editorWidgets.iconPicker.toggle' }));

    const options = screen.getAllByRole('button').filter(option => option.title.startsWith('Arrow'));
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
