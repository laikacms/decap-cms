
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import * as React from 'react';

import { CheckIcon, ChevronRightIcon } from '@/ui/icons/index';
import { css, type WithClassName } from './styled';

export function DropdownMenu(
  props: WithClassName<React.ComponentProps<typeof MenuPrimitive.Root>>,
): React.ReactNode {
  return <MenuPrimitive.Root {...props} />;
}

export function DropdownMenuPortal(
  props: WithClassName<React.ComponentProps<typeof MenuPrimitive.Portal>>,
): React.ReactNode {
  return <MenuPrimitive.Portal {...props} />;
}

export function DropdownMenuTrigger(
  props: WithClassName<React.ComponentProps<typeof MenuPrimitive.Trigger>>,
): React.ReactNode {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

export function DropdownMenuGroup(
  props: WithClassName<React.ComponentProps<typeof MenuPrimitive.Group>>,
): React.ReactNode {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

export function DropdownMenuRadioGroup(
  props: WithClassName<React.ComponentProps<typeof MenuPrimitive.RadioGroup>>,
): React.ReactNode {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

export function DropdownMenuSub(
  props: WithClassName<React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>>,
): React.ReactNode {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

const contentClass = css`
  z-index: 50;
  max-height: var(--available-height);
  min-width: 8rem;
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 0.375rem;
  background-color: var(--popover);
  padding: 0.25rem;
  color: var(--popover-foreground);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
  outline: 1px solid color-mix(in srgb, var(--foreground), transparent 90%);
`;

type PositionerProps = WithClassName<React.ComponentProps<typeof MenuPrimitive.Positioner>>;

export function DropdownMenuContent({
  className,
  align = 'start',
  side,
  sideOffset = 4,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuPrimitive.Popup>> & {
  align?: PositionerProps['align'],
  side?: PositionerProps['side'],
  sideOffset?: number,
}): React.ReactNode {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} side={side} sideOffset={sideOffset}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          css={contentClass}
          className={className}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuPrimitive.Popup>>): React.ReactNode {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner sideOffset={4}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-sub-content"
          css={contentClass}
          className={className}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

const itemClass = css`
  position: relative;
  display: flex;
  cursor: default;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.125rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  outline: none;
  user-select: none;
  &:focus,
  &[data-highlighted] {
    background-color: var(--accent);
    color: var(--accent-foreground);
  }
  &[data-disabled] {
    pointer-events: none;
    opacity: 0.5;
  }
  &[data-inset] {
    padding-left: 2rem;
  }
  &[data-variant='destructive'] {
    color: var(--destructive);
  }
  & svg {
    pointer-events: none;
    flex-shrink: 0;
  }
  & svg:not([class*='size-']) {
    width: 1rem;
    height: 1rem;
  }
`;

const indicatorWrapClass = css`
  pointer-events: none;
  position: absolute;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: WithClassName<React.ComponentProps<typeof MenuPrimitive.Item>> & {
  inset?: boolean,
  variant?: 'default' | 'destructive',
}): React.ReactNode {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      css={itemClass}
      className={className}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuPrimitive.CheckboxItem>>): React.ReactNode {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      css={[
        itemClass,
        css`
          padding-right: 2rem;
        `,
      ]}
      className={className}
      checked={checked}
      {...props}
    >
      <span css={indicatorWrapClass}>
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuPrimitive.RadioItem>>): React.ReactNode {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      css={[
        itemClass,
        css`
          padding-right: 2rem;
        `,
      ]}
      className={className}
      {...props}
    >
      <span css={indicatorWrapClass}>
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger>> & {
  inset?: boolean,
}): React.ReactNode {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      css={itemClass}
      className={className}
      {...props}
    >
      {children}
      <ChevronRightIcon
        css={css`
          margin-left: auto;
        `}
      />
    </MenuPrimitive.SubmenuTrigger>
  );
}

const labelClass = css`
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
  &[data-inset] {
    padding-left: 2rem;
  }
`;

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuPrimitive.GroupLabel>> & {
  inset?: boolean,
}): React.ReactNode {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      css={labelClass}
      className={className}
      {...props}
    />
  );
}

const separatorClass = css`
  margin: 0.25rem -0.25rem;
  height: 1px;
  background-color: var(--border);
`;

export function DropdownMenuSeparator({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuPrimitive.Separator>>): React.ReactNode {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      css={separatorClass}
      className={className}
      {...props}
    />
  );
}

const shortcutClass = css`
  margin-left: auto;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--muted-foreground);
`;

export function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>): React.ReactNode {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      css={shortcutClass}
      className={className}
      {...props}
    />
  );
}
