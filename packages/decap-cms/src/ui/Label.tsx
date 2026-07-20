import * as React from 'react';

import { css } from './styled';

const labelClass = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  line-height: 1;
  font-weight: 500;
  user-select: none;
`;

export function Label({ className, ...props }: React.ComponentProps<'label'>): React.ReactNode {
  return <label data-slot="label" css={labelClass} className={className} {...props} />;
}
