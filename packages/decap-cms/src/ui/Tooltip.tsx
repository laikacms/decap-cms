
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import * as React from 'react';

import { css, type WithClassName } from './styled';

export function TooltipProvider({
  delay = 0,
  ...props
}: WithClassName<React.ComponentProps<typeof TooltipPrimitive.Provider>>): React.ReactNode {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

// Base UI's Tooltip doesn't wire `aria-describedby` itself (unlike its
// Dialog/Popover, which set `aria-labelledby`/`aria-describedby` on their
// own). This context bridges one `id`, generated once per `Tooltip` root,
// between `TooltipTrigger` (which reads it as `aria-describedby`) and
// `TooltipContent` (which sets it as the popup's `id`) so the association
// holds regardless of DOM order or portaling.
const TooltipIdContext = React.createContext<string | undefined>(undefined);

export function Tooltip(
  props: WithClassName<React.ComponentProps<typeof TooltipPrimitive.Root>>,
): React.ReactNode {
  const id = React.useId();
  return (
    <TooltipIdContext.Provider value={id}>
      <TooltipPrimitive.Root {...props} />
    </TooltipIdContext.Provider>
  );
}

export function TooltipTrigger(
  props: WithClassName<React.ComponentProps<typeof TooltipPrimitive.Trigger>>,
): React.ReactNode {
  const id = React.useContext(TooltipIdContext);
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      aria-describedby={id}
      {...props}
    />
  );
}

// Fallbacks keep the tooltip legible even when `EditorGlobalStyles` (the
// only place `--foreground`/`--background` are currently declared) isn't
// mounted — e.g. a `Tooltip` used outside the Lexical editor tree.
const contentClass = css`
  z-index: 50;
  display: inline-flex;
  width: fit-content;
  max-width: 20rem;
  align-items: center;
  gap: 0.375rem;
  border-radius: 0.375rem;
  background-color: var(--foreground, #020817);
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--background, #ffffff);
`;

const arrowClass = css`
  width: 0.5rem;
  height: 0.5rem;
  transform: rotate(45deg);
  border-radius: 2px;
  background-color: var(--foreground, #020817);
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
  id,
  side,
  sideOffset = 5,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof TooltipPrimitive.Popup>> & {
  side?: React.ComponentProps<typeof TooltipPrimitive.Positioner>['side'],
  sideOffset?: number,
}): React.ReactNode {
  const contextId = React.useContext(TooltipIdContext);
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          role="tooltip"
          id={id ?? contextId}
          css={contentClass}
          className={className}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow css={arrowClass} />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
