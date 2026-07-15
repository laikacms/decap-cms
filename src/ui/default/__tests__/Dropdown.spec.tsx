import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Dropdown, {
  DropdownCheckedItem,
  DropdownItem,
  StyledDropdownButton,
} from '@/ui/default/Dropdown';

describe('Dropdown', () => {
  it('renders the trigger as a button with menu ARIA wiring', async () => {
    const user = userEvent.setup();
    render(
      <Dropdown renderButton={() => <StyledDropdownButton>Open menu</StyledDropdownButton>}>
        <DropdownItem label="Edit" onClick={() => {}} />
      </Dropdown>,
    );

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('invokes an item onClick and closes the menu by default', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Dropdown renderButton={() => <StyledDropdownButton>Open menu</StyledDropdownButton>}>
        <DropdownItem label="Edit" onClick={onClick} />
        <DropdownItem label="Delete" onClick={() => {}} />
      </Dropdown>,
    );

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps the menu open after selection when closeOnSelection is false', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Dropdown
        closeOnSelection={false}
        renderButton={() => <StyledDropdownButton>Open menu</StyledDropdownButton>}
      >
        <DropdownItem label="Edit" onClick={onClick} />
      </Dropdown>,
    );

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('opens the menu with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <Dropdown renderButton={() => <StyledDropdownButton>Open menu</StyledDropdownButton>}>
        <DropdownItem label="Edit" onClick={() => {}} />
      </Dropdown>,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
  });

  it('renders checked items with checkbox semantics and toggles via onClick', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <Dropdown
          closeOnSelection={false}
          renderButton={() => <StyledDropdownButton>Filter</StyledDropdownButton>}
        >
          <DropdownCheckedItem
            id="drafts"
            label="Show drafts"
            checked={checked}
            onClick={() => setChecked(prev => !prev)}
          />
        </Dropdown>
      );
    }

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));

    const item = await screen.findByRole('menuitemcheckbox', { name: /Show drafts/ });
    expect(item).toHaveAttribute('aria-checked', 'false');

    await user.click(item);
    expect(
      await screen.findByRole('menuitemcheckbox', { name: /Show drafts/, checked: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('puts menuId on the popover when provided', async () => {
    const user = userEvent.setup();
    render(
      <Dropdown
        menuId="my-menu"
        renderButton={() => <StyledDropdownButton>Open menu</StyledDropdownButton>}
      >
        <DropdownItem label="Edit" onClick={() => {}} />
      </Dropdown>,
    );

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(await screen.findByRole('menu')).toHaveAttribute('id', 'my-menu');
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-controls',
      'my-menu',
    );
  });
});
