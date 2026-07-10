import React from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Wrapper, Button as DropdownButton, Menu, MenuItem } from 'react-aria-menubutton';

import { laikaShouldForwardProp } from '../../laika-app/ui/styled-utils';
import { colors, buttons, components, zIndex } from './styles';
import Icon from './Icon';

import type { IconDirection, IconName } from './Icon/icons';

const StyledWrapper = styled(Wrapper)`
  position: relative;
  font-size: 14px;
  user-select: none;
`;

const StyledDropdownButton = styled(DropdownButton)`
  ${buttons.button};
  ${buttons.default};
  display: block;
  padding-left: 20px;
  padding-right: 40px;
  position: relative;

  &:after {
    ${components.caretDown};
    content: '';
    display: block;
    position: absolute;
    top: 16px;
    right: 10px;
    color: currentColor;
  }
`;

interface DropdownListProps {
  width?: string;
  top?: string;
  position?: 'left' | 'right';
}

const DropdownList = styled.ul<DropdownListProps>`
  ${components.dropdownList};
  margin: 0;
  position: absolute;
  top: 0;
  left: 0;
  min-width: 100%;
  z-index: ${zIndex.zIndex299};

  ${(props: DropdownListProps) => css`
    width: ${props.width};
    top: ${props.top};
    left: ${props.position === 'left' ? 0 : 'auto'};
    right: ${props.position === 'right' ? 0 : 'auto'};
  `};
`;

interface StyledMenuItemProps {
  isActive?: boolean;
  isCheckedItem?: boolean;
  value?: unknown;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

interface StyledMenuItemWrapperProps {
  $isActive?: boolean;
  $isCheckedItem?: boolean;
}

const StyledMenuItemWrapper = styled(MenuItem, {
  shouldForwardProp: prop => laikaShouldForwardProp(prop) || prop === 'value',
})<StyledMenuItemWrapperProps>`
  ${components.dropdownItem};
  &:focus,
  &:active,
  &:not(:focus),
  &:not(:active) {
    background-color: ${(props: StyledMenuItemWrapperProps) =>
      props.$isActive ? colors.activeBackground : 'inherit'};
    color: ${(props: StyledMenuItemWrapperProps) =>
      props.$isActive ? colors.active : '#313d3e'};
    ${(props: StyledMenuItemWrapperProps) =>
      props.$isCheckedItem ? 'display: flex; justify-content: start' : ''};
  }
  &:hover {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
  }
  &.active {
    text-decoration: underline;
  }
`;

function StyledMenuItem({
  isActive,
  isCheckedItem = false,
  ...props
}: StyledMenuItemProps): React.ReactElement {
  return <StyledMenuItemWrapper $isActive={isActive} $isCheckedItem={isCheckedItem} {...props} />;
}

interface MenuItemIconContainerProps {
  iconSmall?: boolean;
}

const MenuItemIconContainer = styled.div<MenuItemIconContainerProps>`
  flex: 1 0 32px;
  text-align: right;
  position: relative;
  top: ${(props: MenuItemIconContainerProps) => (props.iconSmall ? '0' : '2px')};
`;

export interface DropdownProps {
  closeOnSelection?: boolean;
  renderButton: () => React.ReactNode;
  dropdownWidth?: string;
  dropdownPosition?: 'left' | 'right';
  dropdownTopOverlap?: string;
  className?: string;
  children?: React.ReactNode;
  // Optional id for the popover element. react-aria-menubutton's Button/Menu
  // already wire up role="button", aria-haspopup, aria-expanded (on the
  // trigger) and role="menu" / role="menuitem" (on the popover and its
  // items) — the one piece they don't provide is the aria-controls link
  // from trigger to popover. Callers that pass `menuId` here should also
  // put the same id on their trigger's `aria-controls` prop.
  menuId?: string;
}

function Dropdown({
  closeOnSelection = true,
  renderButton,
  dropdownWidth = 'auto',
  dropdownPosition = 'left',
  dropdownTopOverlap = '0',
  className,
  children,
  menuId,
}: DropdownProps): React.ReactElement {
  return (
    <StyledWrapper
      closeOnSelection={closeOnSelection}
      onSelection={(handler: unknown) => {
        if (typeof handler === 'function') {
          handler();
        }
      }}
      className={className}
    >
      {renderButton()}
      <Menu id={menuId}>
        <DropdownList width={dropdownWidth} top={dropdownTopOverlap} position={dropdownPosition}>
          {children}
        </DropdownList>
      </Menu>
    </StyledWrapper>
  );
}

export interface DropdownItemProps {
  label?: string;
  icon?: IconName;
  iconDirection?: IconDirection;
  iconSmall?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

function DropdownItem({
  label,
  icon,
  iconDirection,
  iconSmall,
  isActive,
  onClick,
  className,
}: DropdownItemProps): React.ReactElement {
  return (
    <StyledMenuItem value={onClick} isActive={isActive} className={className}>
      <span>{label}</span>
      {icon ? (
        <MenuItemIconContainer iconSmall={iconSmall}>
          <Icon type={icon} direction={iconDirection} size={iconSmall ? 'xsmall' : 'small'} />
        </MenuItemIconContainer>
      ) : null}
    </StyledMenuItem>
  );
}

const StyledCheckboxInput = styled.input`
  margin-right: 10px;
`;

interface StyledDropdownCheckboxProps {
  checked?: boolean;
  id?: string;
}

function StyledDropdownCheckbox({ checked, id }: StyledDropdownCheckboxProps): React.ReactElement {
  return <StyledCheckboxInput readOnly type="checkbox" checked={checked} id={id} />;
}

export interface DropdownCheckedItemProps {
  label: string;
  id: string;
  checked: boolean;
  onClick: () => void;
}

function DropdownCheckedItem({
  label,
  id,
  checked,
  onClick,
}: DropdownCheckedItemProps): React.ReactElement {
  return (
    <StyledMenuItem isCheckedItem={true} isActive={checked} onClick={onClick}>
      <StyledDropdownCheckbox checked={checked} id={id} />
      <span>{label}</span>
    </StyledMenuItem>
  );
}

export {
  Dropdown as default,
  DropdownItem,
  DropdownCheckedItem,
  DropdownButton,
  StyledDropdownButton,
};
