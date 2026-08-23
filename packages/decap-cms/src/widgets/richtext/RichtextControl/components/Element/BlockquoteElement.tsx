import styled from '@emotion/styled';
import { PlateElement } from 'platejs/react';

import { colors } from '@/ui/default/index';

import type { PlateElementProps } from 'platejs/react';

const bottomMargin = '16px';

const StyledBlockQuote = styled.blockquote`
  padding-left: 16px;
  border-left: 3px solid ${colors.background};
  margin-left: 0;
  margin-right: 0;
  margin-bottom: ${bottomMargin};
`;

export default function BlockquoteElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement asChild {...props}>
      <StyledBlockQuote>{children}</StyledBlockQuote>
    </PlateElement>
  );
}
