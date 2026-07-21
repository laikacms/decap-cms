import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import SettingsButton from '@/widgets/code/SettingsButton';

// DCMS-1301: the gear (open) and close triggers rendered a bare `<button>`
// with only an SVG child, so screen readers announced just "button" with no
// accessible name (WCAG 4.1.2).
describe('SettingsButton accessible name (DCMS-1301)', () => {
  it('exposes the open-trigger aria-label so it is discoverable by role + name', () => {
    render(<SettingsButton showClose={false} onClick={vi.fn()} ariaLabel="Code widget settings" />);
    const button = screen.getByRole('button', { name: /code widget settings/i });
    expect(button).toHaveAttribute('aria-label', 'Code widget settings');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('exposes the close-trigger aria-label so it is discoverable by role + name', () => {
    render(
      <SettingsButton showClose={true} onClick={vi.fn()} ariaLabel="Close code widget settings" />,
    );
    const button = screen.getByRole('button', { name: /close code widget settings/i });
    expect(button).toHaveAttribute('aria-label', 'Close code widget settings');
    expect(button).toHaveAttribute('type', 'button');
  });
});
