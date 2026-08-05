/**
 * Unit tests for the code widget's SettingsPane (DCMS-1824).
 *
 * SettingsPane had zero direct test coverage even though it owns real logic:
 * Esc-key handling (`isHotkey('esc', ...)` → `hideSettings()`), the
 * `allowLanguageSelection` toggle that both shows/hides the language select
 * and moves `autoFocus` between the language and theme selects, `themes:
 * null` hiding the theme select, and each `SettingsSelect` wiring its
 * `onChange` through to the matching `onChange*` prop. This mirrors the
 * render/interaction style used by CodeControl.spec.tsx in this same
 * directory, but exercises SettingsPane directly with plain props instead of
 * going through CodeControl.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import SettingsPane from '@/widgets/code/SettingsPane';

import type { ComponentProps } from 'react';

type SettingsPaneProps = ComponentProps<typeof SettingsPane>;

const MODES = [
  { value: 'none', label: 'none' },
  { value: 'javascript', label: 'JavaScript' },
];

const THEMES = ['default', 'material'];

const KEY_MAPS = [
  { value: 'default', label: 'default' },
  { value: 'vim', label: 'vim' },
];

function baseProps(overrides: Partial<SettingsPaneProps> = {}): SettingsPaneProps {
  return {
    hideSettings: vi.fn(),
    forID: 'snippet-field',
    modes: MODES,
    mode: MODES[0],
    theme: 'default',
    themes: THEMES,
    keyMap: KEY_MAPS[0],
    keyMaps: KEY_MAPS,
    allowLanguageSelection: true,
    onChangeLang: vi.fn(),
    onChangeTheme: vi.fn(),
    onChangeKeyMap: vi.fn(),
    ...overrides,
  };
}

function renderPane(overrides: Partial<SettingsPaneProps> = {}) {
  const props = baseProps(overrides);
  const utils = render(<SettingsPane {...props} />);
  return { ...utils, props };
}

describe('SettingsPane (DCMS-1824)', () => {
  it('calls hideSettings when Esc is pressed inside the pane', () => {
    const hideSettings = vi.fn();
    const { container } = renderPane({ hideSettings });

    const pane = container.firstChild as HTMLElement;
    // isHotkey('esc', ...) is code-based (not byKey), so it matches on the
    // legacy `which`/`keyCode` fields rather than `event.key` alone.
    fireKeyDownEscape(pane);

    expect(hideSettings).toHaveBeenCalledTimes(1);
  });

  it('does not call hideSettings for a non-Esc key', () => {
    const hideSettings = vi.fn();
    const { container } = renderPane({ hideSettings });

    const pane = container.firstChild as HTMLElement;
    fireKeyDown(pane, 'a', 65);

    expect(hideSettings).not.toHaveBeenCalled();
  });

  it('renders the language select and focuses it when allowLanguageSelection is true', () => {
    renderPane({ allowLanguageSelection: true });

    const modeTrigger = screen.getByRole('combobox', { name: 'Mode' });
    expect(modeTrigger).toBeInTheDocument();
    expect(modeTrigger).toHaveFocus();
  });

  it('hides the language select and focuses the theme select when allowLanguageSelection is false', () => {
    renderPane({ allowLanguageSelection: false });

    expect(screen.queryByRole('combobox', { name: 'Mode' })).not.toBeInTheDocument();

    const themeTrigger = screen.getByRole('combobox', { name: 'Theme' });
    expect(themeTrigger).toBeInTheDocument();
    expect(themeTrigger).toHaveFocus();
  });

  it('hides the theme select entirely when themes is null', () => {
    renderPane({ themes: null });

    expect(screen.queryByRole('combobox', { name: 'Theme' })).not.toBeInTheDocument();
    // KeyMap select is unaffected.
    expect(screen.getByRole('combobox', { name: 'KeyMap' })).toBeInTheDocument();
  });

  it('still renders the KeyMap select when both allowLanguageSelection is false and themes is null', () => {
    renderPane({ allowLanguageSelection: false, themes: null });

    expect(screen.queryByRole('combobox', { name: 'Mode' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Theme' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'KeyMap' })).toBeInTheDocument();
  });

  it('calls onChangeLang with the new value when a mode option is selected', async () => {
    const user = userEvent.setup();
    const onChangeLang = vi.fn();
    renderPane({ onChangeLang });

    await user.click(screen.getByRole('combobox', { name: 'Mode' }));
    await user.click(await screen.findByRole('option', { name: 'JavaScript' }));

    expect(onChangeLang).toHaveBeenCalledTimes(1);
    expect(onChangeLang).toHaveBeenCalledWith('javascript');
  });

  it('calls onChangeTheme with the new value when a theme option is selected', async () => {
    const user = userEvent.setup();
    const onChangeTheme = vi.fn();
    renderPane({ onChangeTheme });

    await user.click(screen.getByRole('combobox', { name: 'Theme' }));
    await user.click(await screen.findByRole('option', { name: 'material' }));

    expect(onChangeTheme).toHaveBeenCalledTimes(1);
    expect(onChangeTheme).toHaveBeenCalledWith('material');
  });

  it('calls onChangeKeyMap with the new value when a keymap option is selected', async () => {
    const user = userEvent.setup();
    const onChangeKeyMap = vi.fn();
    renderPane({ onChangeKeyMap });

    await user.click(screen.getByRole('combobox', { name: 'KeyMap' }));
    await user.click(await screen.findByRole('option', { name: 'vim' }));

    expect(onChangeKeyMap).toHaveBeenCalledTimes(1);
    expect(onChangeKeyMap).toHaveBeenCalledWith('vim');
  });
});

function fireKeyDown(element: HTMLElement, key: string, code: number) {
  const event = new window.KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'which', { get: () => code });
  Object.defineProperty(event, 'keyCode', { get: () => code });
  element.dispatchEvent(event);
}

function fireKeyDownEscape(element: HTMLElement) {
  fireKeyDown(element, 'Escape', 27);
}
