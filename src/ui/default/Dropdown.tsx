import React from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Menu } from '@base-ui/react/menu';

import { colors, buttons, components, zIndex } from './styles';
import Icon from './Icon';

import type { IconDirection, IconName } from './Icon/icons';

/**
 * Legacy dropdown primitive, now built on Base UI's Menu (it used to wrap
 * react-aria-menubutton). The exported API is source-compatible with the old
 * implementation: `renderButton` must render a `DropdownButton` (or a styled
 * derivative such as `StyledDropdownButton`) somewhere in its tree. The
 * button is a `Menu.Trigger` under the hood, so it wires itself to the
 * surrounding `Dropdown` through Base UI context, exactly like the old
 * react-aria-menubutton `Button`/`Wrapper` pair did.
 */

/** Blocks emotion-only transient props from reaching Base UI components. */
function forwardNonTransientProp(prop: string): boolean {
  return !prop.startsWith('$');
}

const StyledWrapper = styled.div`
  position: relative;
  font-size: 14px;
  user-select: none;
`;

const DropdownButton = styled(Menu.Trigger)`
  /* Reset native button chrome; the old react-aria-menubutton trigger was a
     bare span, so derived styles expect an unstyled starting point. */
  appearance: none;
  background: none;
  border: 0;
  margin: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: inherit;
  cursor: pointer;
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

const DropdownPositioner = styled(Menu.Positioner)`
  /* The popup is portaled to document.body now, so the old "z-index 299
     inside the header's stacking context" trick no longer applies. Sticky
     headers and the editor toolbar sit at zIndex300; the portal renders
     later in the DOM, so the same z-index still paints on top of them. */
  z-index: ${zIndex.zIndex300};
`;

interface DropdownListProps {
  $width?: string;
}

const DropdownList = styled(Menu.Popup, {
  shouldForwardProp: forwardNonTransientProp,
})<DropdownListProps>`
  ${components.dropdownList};
  margin: 0;
  min-width: var(--anchor-width);
  font-size: 14px;
  user-select: none;
  outline: none;

  ${(props: DropdownListProps) => css`
    width: ${props.$width};
  `};
`;

interface StyledMenuItemWrapperProps {
  $isActive?: boolean;
  $isCheckedItem?: boolean;
}

function menuItemStyles(props: StyledMenuItemWrapperProps) {
  return css`
    ${components.dropdownItem};
    &:focus,
    &:active,
    &:not(:focus),
    &:not(:active) {
      background-color: ${props.$isActive ? colors.activeBackground : 'inherit'};
      color: ${props.$isActive ? colors.active : '#313d3e'};
      ${props.$isCheckedItem ? 'display: flex; justify-content: start' : ''};
    }
    &:hover,
    &[data-highlighted] {
      color: ${colors.active};
      background-color: ${colors.activeBackground};
      outline: none;
    }
    &.active {
      text-decoration: underline;
    }
  `;
}

const StyledMenuItemWrapper = styled(Menu.Item, {
  shouldForwardProp: forwardNonTransientProp,
})<StyledMenuItemWrapperProps>`
  ${menuItemStyles};
`;

const StyledCheckboxItemWrapper = styled(Menu.CheckboxItem, {
  shouldForwardProp: forwardNonTransientProp,
})<StyledMenuItemWrapperProps>`
  ${menuItemStyles};
`;

interface DropdownContextValue {
  closeOnSelection: boolean;
}

const DropdownContext = React.createContext<DropdownContextValue>({ closeOnSelection: true });

interface StyledMenuItemProps {
  isActive?: boolean;
  isCheckedItem?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

function StyledMenuItem({
  isActive,
  isCheckedItem = false,
  ...props
}: StyledMenuItemProps): React.ReactElement {
  const { closeOnSelection } = React.useContext(DropdownContext);
  return (
    <StyledMenuItemWrapper
      $isActive={isActive}
      $isCheckedItem={isCheckedItem}
      closeOnClick={closeOnSelection}
      {...props}
    />
  );
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
  // Optional id for the popover element. Base UI wires up role="button",
  // aria-haspopup and aria-expanded on the trigger, role="menu" /
  // role="menuitem" on the popover and its items, and links the trigger's
  // aria-controls to the popover automatically while open. `menuId` remains
  // for callers that want a stable, known id on the popover.
  menuId?: string;
}

function parsePx(value: string): number {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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
  const contextValue = React.useMemo(() => ({ closeOnSelection }), [closeOnSelection]);
  const topOverlap = parsePx(dropdownTopOverlap);
  return (
    <StyledWrapper className={className}>
      {/* modal={false} preserves the old react-aria-menubutton behavior:
          the page keeps scrolling and outside elements stay interactive
          while the menu is open (outside clicks still dismiss it). */}
      <Menu.Root modal={false}>
        {renderButton()}
        <Menu.Portal>
          <DropdownPositioner
            side="bottom"
            align={dropdownPosition === 'right' ? 'end' : 'start'}
            // The old list was absolutely positioned at the top of the
            // wrapper plus `dropdownTopOverlap`, i.e. it covered the trigger
            // by default. Reproduce that geometry: distance below the
            // trigger's bottom edge = overlap - trigger height.
            sideOffset={({ anchor }) => topOverlap - anchor.height}
          >
            <DropdownList id={menuId} $width={dropdownWidth}>
              <DropdownContext.Provider value={contextValue}>{children}</DropdownContext.Provider>
            </DropdownList>
          </DropdownPositioner>
        </Menu.Portal>
      </Menu.Root>
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
    <StyledMenuItem onClick={onClick} isActive={isActive} className={className}>
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
  return <StyledCheckboxInput readOnly tabIndex={-1} type="checkbox" checked={checked} id={id} />;
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
  const { closeOnSelection } = React.useContext(DropdownContext);
  return (
    <StyledCheckboxItemWrapper
      $isCheckedItem={true}
      $isActive={checked}
      checked={checked}
      closeOnClick={closeOnSelection}
      onClick={onClick}
    >
      <StyledDropdownCheckbox checked={checked} id={id} />
      <span>{label}</span>
    </StyledCheckboxItemWrapper>
  );
}

export {
  Dropdown as default,
  DropdownItem,
  DropdownCheckedItem,
  DropdownButton,
  StyledDropdownButton,
};
