/** @jsxImportSource @emotion/react */
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';

/**
 * Lightweight CSS-only spinner. No animation libraries — just a rotating
 * conic-gradient ring. Used for inline loading states across laika (e.g.
 * config bootstrap, async asset upload).
 */

export type LaikaSpinnerSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<LaikaSpinnerSize, { box: string, border: string }> = {
  sm: { box: '14px', border: '2px' },
  md: { box: '20px', border: '2px' },
  lg: { box: '32px', border: '3px' },
};

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Ring = styled('span', { shouldForwardProp: laikaShouldForwardProp })<{
  $size: LaikaSpinnerSize,
}>`
  display: inline-block;
  width: ${({ $size }) => sizeMap[$size].box};
  height: ${({ $size }) => sizeMap[$size].box};
  border: ${({ $size }) => sizeMap[$size].border} solid ${colors.textFieldBorder};
  border-top-color: ${colors.active};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  vertical-align: middle;
`;

export interface LaikaSpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: LaikaSpinnerSize;
  /** Accessible label announced by screen readers. Defaults to "Loading". */
  label?: string;
}

function LaikaSpinner({ size = 'md', label = 'Loading', ...rest }: LaikaSpinnerProps) {
  return <Ring role="status" aria-label={label} $size={size} {...rest} />;
}

export default LaikaSpinner;
