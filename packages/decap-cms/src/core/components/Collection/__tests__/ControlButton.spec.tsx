import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { colors, Dropdown } from '@/ui/default/index';
import { ControlButton } from '@/core/components/Collection/ControlButton';

function renderInDropdown(active: boolean, title: string) {
  return render(
    <Dropdown renderButton={() => <ControlButton active={active} title={title} />} dropdownWidth="100px">
      <div />
    </Dropdown>,
  );
}

describe('ControlButton', () => {
  it('renders the title', () => {
    renderInDropdown(false, "Sort by");

    expect(screen.getByRole('button', { name: 'Sort by' })).toBeInTheDocument();
  });

  it('applies colors.active as the inline color when active', () => {
    renderInDropdown(true, "Filter by");

    const button = screen.getByText('Filter by');
    expect(button).toHaveStyle({ color: colors.active });
    expect(button.style.color).not.toBe('');
  });

  it('leaves the inline color unset when inactive', () => {
    renderInDropdown(false, "Group by");

    expect(screen.getByText('Group by').style.color).toBe('');
  });
});
