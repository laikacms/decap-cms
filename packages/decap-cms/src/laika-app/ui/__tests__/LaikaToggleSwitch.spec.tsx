import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import LaikaToggleSwitch from '@/laika-app/ui/LaikaToggleSwitch';

describe('LaikaToggleSwitch', () => {
  it('renders an accessible switch', () => {
    render(<LaikaToggleSwitch aria-label="Dark mode" />);
    const toggle = screen.getByRole('switch', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('renders the checked state', () => {
    render(<LaikaToggleSwitch aria-label="Dark mode" defaultChecked />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('fires onCheckedChange when toggled', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<LaikaToggleSwitch aria-label="Dark mode" onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles with the Enter key', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<LaikaToggleSwitch aria-label="Dark mode" onCheckedChange={onCheckedChange} />);
    screen.getByRole('switch').focus();
    await user.keyboard('{Enter}');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('ignores interaction when disabled', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<LaikaToggleSwitch aria-label="Off" disabled onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('data-disabled');
    await user.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
