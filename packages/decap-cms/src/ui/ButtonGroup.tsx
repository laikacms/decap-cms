/** @jsxImportSource @emotion/react */
import * as React from 'react';

import { Separator } from './Separator';
import { css, variants } from './styled';

const groupBase = css`
  display: flex;
  width: fit-content;
  align-items: stretch;
  & > input {
    flex: 1;
  }
`;

export const buttonGroupVariants = variants(groupBase, {
  variants: {
    orientation: {
      horizontal: css`
        & > *:not(:first-child) {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          border-left-width: 0;
        }
        & > *:not(:last-child) {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
      `,
      vertical: css`
        flex-direction: column;
        & > *:not(:first-child) {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
          border-top-width: 0;
        }
        & > *:not(:last-child) {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
      `,
    },
  },
  defaultVariants: { orientation: 'horizontal' },
});

export function ButtonGroup({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }): React.ReactNode {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      css={buttonGroupVariants({ orientation })}
      className={className}
      {...props}
    />
  );
}

const textClass = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background-color: var(--muted);
  padding: 0 0.625rem;
  font-size: 0.875rem;
  font-weight: 500;
  & svg {
    pointer-events: none;
  }
`;

export function ButtonGroupText({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return <div css={textClass} className={className} {...props} />;
}

const groupSeparatorClass = css`
  position: relative;
  align-self: stretch;
  background-color: var(--input);
`;

export function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>): React.ReactNode {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      css={groupSeparatorClass}
      className={className}
      {...props}
    />
  );
}
