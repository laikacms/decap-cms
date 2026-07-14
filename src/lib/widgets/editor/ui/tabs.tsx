import * as React from 'react';

import { css, cx, variants } from './_styled';

const tabsClass = css`
  display: flex;
  gap: 0.5rem;
  &[data-orientation='horizontal'] {
    flex-direction: column;
  }
`;

const TabsContext = React.createContext<{
  activeValue: string;
  orientation: 'horizontal' | 'vertical';
  rootId: string;
  setActiveValue: (value: string) => void;
} | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be rendered inside Tabs');
  return context;
}

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
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeValue = value ?? internalValue;
  const rootId = React.useId();
  const setActiveValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <TabsContext.Provider value={{ activeValue, orientation, rootId, setActiveValue }}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cx(tabsClass, className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
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
  onKeyDown,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'line';
}): React.ReactNode {
  const { orientation } = useTabsContext();
  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      data-slot="tabs-list"
      data-variant={variant}
      className={tabsListVariants({ variant, className })}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        const tabs = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
        );
        const currentIndex = tabs.indexOf(event.target as HTMLButtonElement);
        if (currentIndex < 0 || tabs.length === 0) return;

        const previousKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
        let nextIndex: number | undefined;
        if (event.key === previousKey) nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === nextKey) nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === undefined) return;

        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      }}
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
  &[data-state='active'] {
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
  onClick,
  ...props
}: React.ComponentProps<'button'> & { value: string }): React.ReactNode {
  const context = useTabsContext();
  const isActive = context.activeValue === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${context.rootId}-trigger-${value}`}
      aria-controls={`${context.rootId}-content-${value}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      data-slot="tabs-trigger"
      data-state={isActive ? 'active' : 'inactive'}
      className={cx(triggerClass, className)}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) context.setActiveValue(value);
      }}
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
  const context = useTabsContext();
  if (context.activeValue !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${context.rootId}-content-${value}`}
      aria-labelledby={`${context.rootId}-trigger-${value}`}
      data-slot="tabs-content"
      data-state="active"
      className={cx(contentClass, className)}
      {...props}
    />
  );
}
