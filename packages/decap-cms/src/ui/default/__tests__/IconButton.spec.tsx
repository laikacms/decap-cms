import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import IconButton from '@/ui/default/IconButton';

/**
 * Regression test for DCMS-1234: `IconButton` set `title` for the visual
 * tooltip but no `aria-label`, so screen readers announced no accessible
 * name for icon-only buttons (e.g. the editor's i18n/preview/scroll-sync
 * toggles).
 */
describe('IconButton - accessible name (DCMS-1234)', () => {
  it('renders a title attribute on the button', () => {
    const { getByRole } = render(
      <IconButton size="small" type="close" title="Close preview" />,
    );

    const button = getByRole('button', { name: 'Close preview' });
    expect(button.getAttribute('title')).toBe('Close preview');
  });

  it('exposes an accessible name via aria-label matching the title', () => {
    const { getByRole } = render(
      <IconButton size="small" type="close" title="Close preview" />,
    );

    const button = getByRole('button', { name: 'Close preview' });
    expect(button.getAttribute('aria-label')).toBe('Close preview');
  });
});

/**
 * Regression test for DCMS-1271: binary-toggle `IconButton` usages (Toggle
 * preview / i18n / scroll-sync) never emitted `aria-pressed`, so screen
 * readers couldn't announce whether the toggle was currently on or off.
 */
describe('IconButton - aria-pressed for binary toggles (DCMS-1271)', () => {
  it('does not render aria-pressed when isToggle is not set', () => {
    const { getByRole } = render(
      <IconButton size="small" type="eye" title="Toggle preview" isActive />,
    );

    const button = getByRole('button', { name: 'Toggle preview' });
    expect(button.hasAttribute('aria-pressed')).toBe(false);
  });

  it('renders aria-pressed="true" when isToggle is set and isActive is true', () => {
    const { getByRole } = render(
      <IconButton size="small" type="eye" title="Toggle preview" isToggle isActive />,
    );

    const button = getByRole('button', { name: 'Toggle preview' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders aria-pressed="false" when isToggle is set and isActive is false', () => {
    const { getByRole } = render(
      <IconButton size="small" type="eye" title="Toggle preview" isToggle isActive={false} />,
    );

    const button = getByRole('button', { name: 'Toggle preview' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders aria-pressed="false" when isToggle is set and isActive is omitted', () => {
    const { getByRole } = render(
      <IconButton size="small" type="eye" title="Toggle preview" isToggle />,
    );

    const button = getByRole('button', { name: 'Toggle preview' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });
});
