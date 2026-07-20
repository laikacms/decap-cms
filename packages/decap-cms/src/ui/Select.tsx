
import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as React from 'react';

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@/ui/icons/index';
import { css, type WithClassName } from './styled';

export function Select({
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof SelectPrimitive.Root>, 'onValueChange'> & {
  onValueChange?: (value: string) => void,
}): React.ReactNode {
  return (
    <SelectPrimitive.Root
      onValueChange={onValueChange && ((value: unknown) => onValueChange(value as string))}
      {...props}
    />
  );
}

export function SelectValue(
  props: WithClassName<React.ComponentProps<typeof SelectPrimitive.Value>>,
): React.ReactNode {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

const groupClass = css`
  padding: 0.25rem;
`;

export function SelectGroup({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectPrimitive.Group>>): React.ReactNode {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      css={groupClass}
      className={className}
      {...props}
    />
  );
}

const triggerClass = css`
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
  border-radius: 0.375rem;
  border: 1px solid var(--input);
  background-color: transparent;
  padding: 0.5rem 0.5rem 0.5rem 0.625rem;
  font-size: 0.875rem;
  white-space: nowrap;
  outline: none;
  cursor: pointer;
  transition:
    color 0.15s,
    box-shadow 0.15s;
  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring), transparent 50%);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  & [data-placeholder] {
    color: var(--muted-foreground);
  }
  &[data-size='default'] {
    height: 2.25rem;
  }
  &[data-size='sm'] {
    height: 2rem;
  }
  & svg {
    pointer-events: none;
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
  }
`;

export function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectPrimitive.Trigger>> & {
  size?: 'sm' | 'default',
}): React.ReactNode {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      css={triggerClass}
      className={className}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon
            css={css`
              color: var(--muted-foreground);
            `}
          />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

const contentClass = css`
  position: relative;
  z-index: 50;
  max-height: var(--available-height);
  min-width: 9rem;
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 0.375rem;
  background-color: var(--popover);
  color: var(--popover-foreground);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
  outline: 1px solid color-mix(in srgb, var(--foreground), transparent 90%);
`;

const scrollButtonClass = css`
  position: absolute;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  cursor: default;
  align-items: center;
  justify-content: center;
  background-color: var(--popover);
  padding: 0.25rem 0;
  & svg:not([class*='size-']) {
    width: 1rem;
    height: 1rem;
  }
`;

export function SelectScrollUpButton({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>>): React.ReactNode {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      css={[
        scrollButtonClass,
        css`
          top: 0;
        `,
      ]}
      className={className}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  );
}

export function SelectScrollDownButton({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>>): React.ReactNode {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      css={[
        scrollButtonClass,
        css`
          bottom: 0;
        `,
      ]}
      className={className}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  );
}

type PositionerProps = WithClassName<React.ComponentProps<typeof SelectPrimitive.Positioner>>;

export function SelectContent({
  className,
  children,
  align,
  side,
  sideOffset,
  alignItemWithTrigger,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectPrimitive.Popup>> & {
  align?: PositionerProps['align'],
  side?: PositionerProps['side'],
  sideOffset?: number,
  alignItemWithTrigger?: boolean,
}): React.ReactNode {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignItemWithTrigger={alignItemWithTrigger}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          css={contentClass}
          className={className}
          {...props}
        >
          <SelectScrollUpButton />
          {children}
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

const selectLabelClass = css`
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
`;

export function SelectLabel({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectPrimitive.GroupLabel>>): React.ReactNode {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      css={selectLabelClass}
      className={className}
      {...props}
    />
  );
}

const selectItemClass = css`
  position: relative;
  display: flex;
  width: 100%;
  cursor: default;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.125rem;
  padding: 0.375rem 2rem 0.375rem 0.5rem;
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
  & svg {
    pointer-events: none;
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
  }
`;

const selectItemIndicatorClass = css`
  pointer-events: none;
  position: absolute;
  right: 0.5rem;
  display: flex;
  width: 1rem;
  height: 1rem;
  align-items: center;
  justify-content: center;
`;

export function SelectItem({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectPrimitive.Item>>): React.ReactNode {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      css={selectItemClass}
      className={className}
      {...props}
    >
      <span css={selectItemIndicatorClass}>
        <SelectPrimitive.ItemIndicator>
          <CheckIcon />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

const selectSeparatorClass = css`
  pointer-events: none;
  margin: 0.25rem -0.25rem;
  height: 1px;
  background-color: var(--border);
`;

export function SelectSeparator({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectPrimitive.Separator>>): React.ReactNode {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      css={selectSeparatorClass}
      className={className}
      {...props}
    />
  );
}
