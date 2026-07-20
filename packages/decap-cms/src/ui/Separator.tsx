import * as React from 'react';

import { css } from './styled';

const separatorClass = css`
  flex-shrink: 0;
  background-color: var(--border);
  &[data-orientation='horizontal'] {
    height: 1px;
    width: 100%;
  }
  &[data-orientation='vertical'] {
    width: 1px;
    align-self: stretch;
  }
`;

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<'div'> & {
  orientation?: 'horizontal' | 'vertical',
  decorative?: boolean,
}): React.ReactNode {
  return (
    <div
      data-slot="separator"
      data-orientation={orientation}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      css={separatorClass}
      className={className}
      {...props}
    />
  );
}
