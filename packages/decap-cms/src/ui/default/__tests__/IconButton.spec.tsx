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
