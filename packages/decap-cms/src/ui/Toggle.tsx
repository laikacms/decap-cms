
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import * as React from 'react';

import { css, variants, type WithClassName } from './styled';

export type ToggleVariant = 'default' | 'outline';
export type ToggleSize = 'default' | 'sm' | 'lg';

/**
 * Shared, unstyled Base UI `Switch` parts. Consumers supply their own visual
 * layer (via the `render` prop for the root element, and/or their own thumb
 * markup) so on/off toggle implementations across the app converge on a
 * single controlled, accessible primitive instead of hand-rolled state.
 */
export function Switch(
  props: WithClassName<React.ComponentProps<typeof SwitchPrimitive.Root>>,
): React.ReactNode {
  return <SwitchPrimitive.Root data-slot="switch" {...props} />;
}

export function SwitchThumb(
  props: WithClassName<React.ComponentProps<typeof SwitchPrimitive.Thumb>>,
): React.ReactNode {
  return <SwitchPrimitive.Thumb data-slot="switch-thumb" {...props} />;
}

const base = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
  background-color: transparent;
  transition:
    color 0.15s,
    box-shadow 0.15s,
    background-color 0.15s;
  &:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring), transparent 70%);
  }
  &:disabled {
    pointer-events: none;
    opacity: 0.5;
  }
  &[aria-pressed='true'],
  &[data-pressed] {
    background-color: var(--muted);
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

export const toggleVariants = variants(base, {
  variants: {
    variant: {
      default: css`
        background-color: transparent;
      `,
      outline: css`
        border-color: var(--input);
        &:hover {
          background-color: var(--muted);
        }
      `,
    },
    size: {
      default: css`
        height: 2.25rem;
        min-width: 2.25rem;
        padding: 0 0.625rem;
      `,
      sm: css`
        height: 2rem;
        min-width: 2rem;
        padding: 0 0.625rem;
      `,
      lg: css`
        height: 2.5rem;
        min-width: 2.5rem;
        padding: 0 0.625rem;
      `,
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export function Toggle({
  className,
  variant = 'default',
  size = 'default',
  pressed,
  defaultPressed = false,
  onPressedChange,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onChange' | 'value'> & {
  variant?: ToggleVariant,
  size?: ToggleSize,
  pressed?: boolean,
  defaultPressed?: boolean,
  onPressedChange?: (pressed: boolean) => void,
  /** Identifier used when the toggle is rendered inside a toggle group. */
  value?: string,
}): React.ReactNode {
  return (
    <TogglePrimitive
      data-slot="toggle"
      pressed={pressed}
      defaultPressed={defaultPressed}
      onPressedChange={onPressedChange && ((nextPressed: boolean) => onPressedChange(nextPressed))}
      css={toggleVariants({ variant, size })}
      className={className}
      {...props}
    />
  );
}
