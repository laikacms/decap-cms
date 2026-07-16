/** @jsxImportSource @emotion/react */
import { Tooltip } from '@base-ui/react/tooltip';
import styled from '@emotion/styled';
import React from 'react';

import { colors, zIndex } from '@/ui/default/index';

/**
 * Tooltip built on Base UI's `Tooltip`. Wraps a single element child and
 * reveals `content` above (or below) it on hover / keyboard focus. The
 * trigger delegates to the child via Base UI's `render` prop, so the child
 * stays the interactive element (no nested buttons). The popup renders in a
 * portal, so it escapes `overflow: hidden` containers.
 *
 * For more complex needs (click-triggered popovers, etc.) compose a custom
 * component on top of `LaikaDialog` instead.
 */

export type LaikaTooltipPlacement = 'top' | 'bottom';

const Positioner = styled(Tooltip.Positioner)`
  z-index: ${zIndex.zIndex99999};
`;

const Bubble = styled(Tooltip.Popup)`
  white-space: nowrap;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: ${colors.textLead};
  color: ${colors.foreground};
`;

export interface LaikaTooltipProps {
  content: React.ReactNode;
  placement?: LaikaTooltipPlacement;
  children: React.ReactElement;
}

function LaikaTooltip({ content, placement = 'top', children }: LaikaTooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={0} render={children} />
      <Tooltip.Portal>
        <Positioner side={placement} sideOffset={6}>
          <Bubble role="tooltip">{content}</Bubble>
        </Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export default LaikaTooltip;
