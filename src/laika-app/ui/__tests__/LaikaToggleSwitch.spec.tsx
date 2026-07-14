import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LaikaToggleSwitch from '@/laika-app/ui/LaikaToggleSwitch';

describe('LaikaToggleSwitch', () => {
  it('renders an accessible switch input', () => {
    const { getByRole } = render(<LaikaToggleSwitch aria-label="Dark mode" />);
    const input = getByRole('switch') as HTMLInputElement;
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(false);
  });

  it('renders the checked state', () => {
    const { getByRole } = render(<LaikaToggleSwitch aria-label="Dark mode" defaultChecked />);
    expect((getByRole('switch') as HTMLInputElement).checked).toBe(true);
  });

  it('fires onChange when toggled', () => {
    const onChange = vi.fn();
    const { getByRole } = render(<LaikaToggleSwitch aria-label="Dark mode" onChange={onChange} />);
    fireEvent.click(getByRole('switch'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('exposes the disabled attribute', () => {
    const { getByRole } = render(<LaikaToggleSwitch aria-label="Off" disabled />);
    const input = getByRole('switch') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
