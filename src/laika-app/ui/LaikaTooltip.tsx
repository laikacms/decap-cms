/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';

import { colors, zIndex } from '../../ui/default/index';
import { laikaShouldForwardProp } from './styled-utils';

/**
 * CSS-only tooltip. Wraps a single child and reveals `content` above (or
 * below) it on hover / focus. No portal — uses absolute positioning, so
 * place inside a container with `overflow: visible`.
 *
 * For more complex needs (collision detection, click-triggered popovers,
 * etc.) compose a custom component on top of `LaikaDialog` instead.
 */

export type LaikaTooltipPlacement = 'top' | 'bottom';

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const Bubble = styled('span', { shouldForwardProp: laikaShouldForwardProp })<{
  $placement: LaikaTooltipPlacement;
}>`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  ${({ $placement }) =>
    $placement === 'top'
      ? `
    bottom: calc(100% + 6px);
  `
      : `
    top: calc(100% + 6px);
  `}
  pointer-events: none;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: ${colors.textLead};
  color: ${colors.foreground};
  opacity: 0;
  z-index: ${zIndex.zIndex99999};
  transition: opacity 0.12s ease;
`;

const Target = styled.span`
  display: inline-flex;
  align-items: center;

  &:hover + ${Bubble}, &:focus-within + ${Bubble} {
    opacity: 1;
  }
`;

export interface LaikaTooltipProps {
  content: React.ReactNode;
  placement?: LaikaTooltipPlacement;
  children: React.ReactNode;
}

function LaikaTooltip({ content, placement = 'top', children }: LaikaTooltipProps) {
  return (
    <Wrap>
      <Target>{children}</Target>
      <Bubble role="tooltip" $placement={placement}>
        {content}
      </Bubble>
    </Wrap>
  );
}

export default LaikaTooltip;
