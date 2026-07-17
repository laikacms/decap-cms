import React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/Tooltip';

/**
 * Backwards-compatible convenience wrapper over the canonical `@/ui`
 * Tooltip primitives (DCMS-544, per #635/DCMS-548). Composes the single
 * Base UI Tooltip implementation in `src/ui/Tooltip.tsx` behind laika-app's
 * simpler `content`/`placement`/`children` call shape instead of hand-rolling
 * a second Root/Positioner/Popup wrapper, so
 * `@laikacms/decap-cms/laika-app/bare` consumers importing `LaikaTooltip`
 * don't need to change call sites.
 */

export type LaikaTooltipPlacement = 'top' | 'bottom';

export interface LaikaTooltipProps {
  content: React.ReactNode;
  placement?: LaikaTooltipPlacement;
  children: React.ReactElement;
}

function LaikaTooltip({ content, placement = 'top', children }: LaikaTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger delay={0} render={children} />
      <TooltipContent side={placement}>{content}</TooltipContent>
    </Tooltip>
  );
}

export default LaikaTooltip;
