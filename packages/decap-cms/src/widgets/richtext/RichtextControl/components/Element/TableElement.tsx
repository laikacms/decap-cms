import styled from '@emotion/styled';

import type { PlateElementProps } from 'platejs/react';

const StyledTable = styled.table`
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
`;

export default function TableElement({ children, attributes, nodeProps }: PlateElementProps) {
  return (
    <StyledTable {...attributes} {...nodeProps}>
      <tbody>{children}</tbody>
    </StyledTable>
  );
}
