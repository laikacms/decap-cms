import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import * as React from 'react';

import { css, cx, type WithClassName } from './_styled';

export function TooltipProvider({
  delay = 0,
  ...props
}: WithClassName<React.ComponentProps<typeof TooltipPrimitive.Provider>>): React.ReactNode {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

export function Tooltip(
  props: WithClassName<React.ComponentProps<typeof TooltipPrimitive.Root>>,
): React.ReactNode {
  return <TooltipPrimitive.Root {...props} />;
}

export function TooltipTrigger(
  props: WithClassName<React.ComponentProps<typeof TooltipPrimitive.Trigger>>,
): React.ReactNode {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

const contentClass = css`
  z-index: 50;
  display: inline-flex;
  width: fit-content;
  max-width: 20rem;
  align-items: center;
  gap: 0.375rem;
  border-radius: 0.375rem;
  background-color: var(--foreground);
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--background);
`;

const arrowClass = css`
  width: 0.5rem;
  height: 0.5rem;
  transform: rotate(45deg);
  border-radius: 2px;
  background-color: var(--foreground);
  &[data-side='top'] {
    bottom: -0.25rem;
  }
  &[data-side='bottom'] {
    top: -0.25rem;
  }
  &[data-side='left'] {
    right: -0.25rem;
  }
  &[data-side='right'] {
    left: -0.25rem;
  }
`;

export function TooltipContent({
  className,
  sideOffset = 5,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof TooltipPrimitive.Popup>> & {
  sideOffset?: number;
}): React.ReactNode {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cx(contentClass, className)}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className={arrowClass} />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
