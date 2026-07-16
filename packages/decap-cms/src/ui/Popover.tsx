/** @jsxImportSource @emotion/react */
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as React from 'react';

import { css, type WithClassName } from './styled';

export function Popover(
  props: WithClassName<React.ComponentProps<typeof PopoverPrimitive.Root>>,
): React.ReactNode {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger(
  props: WithClassName<React.ComponentProps<typeof PopoverPrimitive.Trigger>>,
): React.ReactNode {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

const contentClass = css`
  z-index: 50;
  display: flex;
  width: 18rem;
  flex-direction: column;
  gap: 1rem;
  border-radius: 0.375rem;
  background-color: var(--popover);
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--popover-foreground);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
  outline: 1px solid color-mix(in srgb, var(--foreground), transparent 90%);
`;

type PositionerProps = WithClassName<React.ComponentProps<typeof PopoverPrimitive.Positioner>>;

export function PopoverContent({
  className,
  align = 'center',
  side,
  sideOffset = 4,
  anchor,
  ...props
}: WithClassName<React.ComponentProps<typeof PopoverPrimitive.Popup>> & {
  align?: PositionerProps['align'],
  side?: PositionerProps['side'],
  sideOffset?: number,
  anchor?: PositionerProps['anchor'],
}): React.ReactNode {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner align={align} side={side} sideOffset={sideOffset} anchor={anchor}>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          css={contentClass}
          className={className}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

const headerClass = css`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
`;

export function PopoverHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="popover-header" css={headerClass} className={className} {...props} />;
}

const titleClass = css`
  font-weight: 500;
`;

export function PopoverTitle({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="popover-title" css={titleClass} className={className} {...props} />;
}

const descriptionClass = css`
  color: var(--muted-foreground);
`;

export function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<'p'>): React.ReactNode {
  return <p data-slot="popover-description" css={descriptionClass} className={className} {...props} />;
}
