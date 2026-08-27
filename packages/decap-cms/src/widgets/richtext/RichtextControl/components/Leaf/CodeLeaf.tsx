import styled from '@emotion/styled';
import { PlateLeaf } from 'platejs/react';

import { colors, lengths } from '@/ui/default/index';

import type { PlateLeafProps } from 'platejs/react';

const StyledCode = styled(PlateLeaf)`
  background-color: ${colors.background};
  border-radius: ${lengths.borderRadius};
  padding: 0 2px;
  font-size: 85%;
`;

export default function CodeLeaf({ children, ...props }: PlateLeafProps) {
  return <StyledCode as="code" {...props}>{children}</StyledCode>;
}
