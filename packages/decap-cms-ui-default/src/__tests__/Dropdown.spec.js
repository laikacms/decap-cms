import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import Dropdown, { DropdownItem, DropdownCheckedItem, DropdownButton } from '../Dropdown';
import { colors } from '../styles';

function openMenu() {
  fireEvent.click(screen.getByRole('button'));
}

function setup(children) {
  const utils = render(
    <Dropdown renderButton={() => <DropdownButton>Open</DropdownButton>}>{children}</Dropdown>,
  );
  openMenu();
  return utils;
}

describe('DropdownItem', () => {
  it('renders the label', () => {
    setup(<DropdownItem label="First item" onClick={jest.fn()} />);

    expect(screen.getByText('First item')).toBeInTheDocument();
  });

  it('does not render an icon when no icon prop is provided', () => {
    const { container } = setup(<DropdownItem label="No icon" onClick={jest.fn()} />);

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders an icon when an icon prop is provided', () => {
    const { container } = setup(<DropdownItem label="With icon" icon="add" onClick={jest.fn()} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the icon at small size when iconSmall is set', () => {
    setup(<DropdownItem label="Small icon" icon="add" iconSmall onClick={jest.fn()} />);

    const iconContainer = screen.getByText('Small icon').nextElementSibling;
    expect(iconContainer).toHaveStyle({ top: '0' });
  });

  it('renders the icon at the default offset when iconSmall is not set', () => {
    setup(<DropdownItem label="Default icon" icon="add" onClick={jest.fn()} />);

    const iconContainer = screen.getByText('Default icon').nextElementSibling;
    expect(iconContainer).toHaveStyle({ top: '2px' });
  });

  it('invokes onClick when selected', () => {
    const onClick = jest.fn();
    setup(<DropdownItem label="Clickable" onClick={onClick} />);

    fireEvent.click(screen.getByText('Clickable'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('DropdownCheckedItem', () => {
  it('renders a checkbox reflecting checked=true', () => {
    setup(
      <DropdownCheckedItem label="Checked item" id="checked-item" checked onClick={jest.fn()} />,
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('renders a checkbox reflecting checked=false', () => {
    setup(
      <DropdownCheckedItem
        label="Unchecked item"
        id="unchecked-item"
        checked={false}
        onClick={jest.fn()}
      />,
    );

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('renders the label', () => {
    setup(<DropdownCheckedItem label="My label" id="my-label" checked onClick={jest.fn()} />);

    expect(screen.getByText('My label')).toBeInTheDocument();
  });

  it('applies active styling when checked is true', () => {
    setup(<DropdownCheckedItem label="Active item" id="active-item" checked onClick={jest.fn()} />);

    const menuItem = screen.getByText('Active item').closest('[role="menuitem"]');
    expect(menuItem).toHaveStyle({ color: colors.active });
  });

  it('does not apply active styling when checked is false', () => {
    setup(
      <DropdownCheckedItem
        label="Inactive item"
        id="inactive-item"
        checked={false}
        onClick={jest.fn()}
      />,
    );

    const menuItem = screen.getByText('Inactive item').closest('[role="menuitem"]');
    expect(menuItem).not.toHaveStyle({ color: colors.active });
  });

  it('invokes onClick when selected', () => {
    const onClick = jest.fn();
    setup(
      <DropdownCheckedItem label="Selectable" id="selectable" checked={false} onClick={onClick} />,
    );

    fireEvent.click(screen.getByText('Selectable').closest('[role="menuitem"]'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
