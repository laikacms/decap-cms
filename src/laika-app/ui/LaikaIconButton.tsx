/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from './styled-utils';

/**
 * Circular icon-only button — used for the dark-mode toggle, future "close"
 * affordances, and other icon-led actions. Mirrors LaikaButton's hover/focus
 * affordance using `controlLabel` as the resting color and `active` on
 * interaction.
 */

export type LaikaIconButtonSize = 'md' | 'sm';

const sizeMap: Record<LaikaIconButtonSize, { box: string; icon: string }> = {
  md: { box: '36px', icon: '18px' },
  sm: { box: '28px', icon: '14px' },
};

const Button = styled('button', { shouldForwardProp: laikaShouldForwardProp })<{
  $size: LaikaIconButtonSize;
  $active?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => sizeMap[$size].box};
  height: ${({ $size }) => sizeMap[$size].box};
  border-radius: 9999px;
  background: ${({ $active }) => ($active ? colors.activeBackground : 'transparent')};
  color: ${({ $active }) => ($active ? colors.active : colors.controlLabel)};
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Icon (ui/default) wraps its svg in a fixed-size span; size the wrapper
     too or the shrunken svg sits top-left inside it, off-center. */
  > span {
    width: ${({ $size }) => sizeMap[$size].icon};
    height: ${({ $size }) => sizeMap[$size].icon};
    line-height: 0;
  }

  svg {
    width: ${({ $size }) => sizeMap[$size].icon};
    height: ${({ $size }) => sizeMap[$size].icon};
    display: block;
  }
`;

export interface LaikaIconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'size'
> {
  size?: LaikaIconButtonSize;
  /** Whether this button shows in an "active" toggled state. */
  active?: boolean;
  /** Always required — icon-only buttons need an accessible label. */
  'aria-label': string;
}

const LaikaIconButton = React.forwardRef<HTMLButtonElement, LaikaIconButtonProps>(
  function LaikaIconButton({ size = 'md', active, type = 'button', children, ...rest }, ref) {
    return (
      <Button ref={ref} $size={size} $active={active} type={type} {...rest}>
        {children}
      </Button>
    );
  },
);

export default LaikaIconButton;
