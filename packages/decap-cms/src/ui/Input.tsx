import { Input as InputPrimitive } from '@base-ui/react/input';
import * as React from 'react';

import { css, type WithClassName } from './styled';

const inputClass = css`
  height: 2.25rem;
  width: 100%;
  min-width: 0;
  border-radius: 0.375rem;
  border: 1px solid var(--input);
  background-color: transparent;
  padding: 0.25rem 0.625rem;
  font-size: 0.875rem;
  outline: none;
  transition: color 0.15s, box-shadow 0.15s;
  &::placeholder {
    color: var(--muted-foreground);
  }
  &:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring), transparent 50%);
  }
  &:disabled {
    pointer-events: none;
    cursor: not-allowed;
    opacity: 0.5;
  }
  &[data-invalid] {
    border-color: var(--destructive);
  }
`;

export type InputProps = WithClassName<React.ComponentProps<typeof InputPrimitive>>;

/**
 * Styled `@base-ui/react` Input. Behaves like a native `<input>` when used
 * standalone, and participates in `Field` labeling, `aria-describedby`
 * wiring, and validation state automatically when rendered inside a
 * `Field` (`Field.Root`) from `./Field`.
 */
export function Input({ className, type, ...props }: InputProps): React.ReactNode {
  return <InputPrimitive type={type} data-slot="input" css={inputClass} className={className} {...props} />;
}
