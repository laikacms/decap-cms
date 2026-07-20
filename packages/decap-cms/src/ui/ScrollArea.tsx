
import * as React from 'react';

import { css } from './styled';

const rootClass = css`
  position: relative;
  overflow: auto;
  border-radius: inherit;
  outline: none;
`;

const scrollbarStyles = css`
  scrollbar-color: var(--border) transparent;
  scrollbar-width: thin;
  &::-webkit-scrollbar {
    width: 0.625rem;
    height: 0.625rem;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 9999px;
    background-color: var(--border);
  }
`;

export function ScrollBar(
  _props: React.ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' },
): null {
  return null;
}

export function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-slot="scroll-area"
      css={[rootClass, scrollbarStyles]}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
