
import * as React from 'react';

import { css } from './styled';

const boxClass = css`
  appearance: none;
  display: grid;
  place-content: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  margin: 0;
  border-radius: 4px;
  border: 1px solid var(--input);
  outline: none;
  cursor: pointer;
  transition: box-shadow 0.15s;
  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring), transparent 50%);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  &:checked {
    border-color: var(--primary);
    background-color: var(--primary);
    color: var(--primary-foreground);
  }
  &:checked::after {
    content: '';
    width: 0.5rem;
    height: 0.25rem;
    transform: translateY(-1px) rotate(-45deg);
    border-bottom: 2px solid currentColor;
    border-left: 2px solid currentColor;
  }
`;

export interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({ className, onCheckedChange, ...props }: CheckboxProps): React.ReactNode {
  return (
    <input
      data-slot="checkbox"
      type="checkbox"
      css={boxClass}
      className={className}
      onChange={event => onCheckedChange?.(event.currentTarget.checked)}
      {...props}
    />
  );
}
