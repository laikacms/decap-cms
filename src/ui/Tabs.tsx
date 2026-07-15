/** @jsxImportSource @emotion/react */
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import * as React from 'react';

import { css, variants } from './styled';

const tabsClass = css`
  display: flex;
  gap: 0.5rem;
  &[data-orientation='horizontal'] {
    flex-direction: column;
  }
`;

export function Tabs({
  className,
  orientation = 'horizontal',
  value,
  defaultValue = '',
  onValueChange,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}): React.ReactNode {
  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      orientation={orientation}
      onValueChange={nextValue => onValueChange?.(nextValue as string)}
      data-slot="tabs"
      css={tabsClass}
      className={className}
      {...props}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

const listBase = css`
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 3px;
  color: var(--muted-foreground);
`;

export const tabsListVariants = variants(listBase, {
  variants: {
    variant: {
      default: css`
        background-color: var(--muted);
      `,
      line: css`
        gap: 0.25rem;
        background-color: transparent;
        border-radius: 0;
      `,
    },
  },
  defaultVariants: { variant: 'default' },
});

export function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'line';
}): React.ReactNode {
  return (
    <TabsPrimitive.List
      activateOnFocus
      data-slot="tabs-list"
      data-variant={variant}
      css={tabsListVariants({ variant })}
      className={className}
      {...props}
    />
  );
}

const triggerClass = css`
  position: relative;
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  color: color-mix(in srgb, var(--foreground), transparent 40%);
  transition: all 0.15s;
  &:hover {
    color: var(--foreground);
  }
  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring), transparent 50%);
  }
  &:disabled {
    pointer-events: none;
    opacity: 0.5;
  }
  &[data-active] {
    background-color: var(--background);
    color: var(--foreground);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
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

export function TabsTrigger({
  className,
  value,
  ...props
}: React.ComponentProps<'button'> & { value: string }): React.ReactNode {
  return (
    <TabsPrimitive.Tab
      value={value}
      data-slot="tabs-trigger"
      css={triggerClass}
      className={className}
      {...props}
    />
  );
}

const contentClass = css`
  flex: 1;
  font-size: 0.875rem;
  outline: none;
`;

export function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<'div'> & { value: string }): React.ReactNode {
  return (
    <TabsPrimitive.Panel
      value={value}
      data-slot="tabs-content"
      css={contentClass}
      className={className}
      {...props}
    />
  );
}
