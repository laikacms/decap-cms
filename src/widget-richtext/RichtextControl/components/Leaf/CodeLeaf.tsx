// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import React from 'react';
import styled from '@emotion/styled';
import { colors, lengths } from '../../../../ui-default/index';

const StyledCode = styled.code`
  background-color: ${colors.background};
  border-radius: ${lengths.borderRadius};
  padding: 0 2px;
  font-size: 85%;
`;

function CodeLeaf({ children, ...props }) {
  return (
    <StyledCode asChild {...props}>
      {children}
    </StyledCode>
  );
}

export default CodeLeaf;