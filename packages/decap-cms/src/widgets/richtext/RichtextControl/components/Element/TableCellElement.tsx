import styled from '@emotion/styled';

import type { PlateElementProps } from 'platejs/react';

const StyledTd = styled.td`
  border: 1px solid black;
  padding: 8px;
  text-align: left;
`;

export default function TableCellElement({ children, attributes }: PlateElementProps) {
  return (
    <StyledTd {...attributes}>
      {children}
    </StyledTd>
  );
}
