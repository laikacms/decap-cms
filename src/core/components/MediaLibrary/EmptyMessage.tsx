import React from 'react';
import styled from '@emotion/styled';

import { colors } from '@/ui/default/index';

const EmptyMessageContainer = styled.div<{ $isPrivate?: boolean }>`
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${props => props.$isPrivate && colors.textFieldBorder};
`;

interface EmptyMessageProps {
  content: string;
  isPrivate?: boolean;
}

function EmptyMessage({ content, isPrivate }: EmptyMessageProps) {
  return (
    <EmptyMessageContainer $isPrivate={isPrivate}>
      <h1>{content}</h1>
    </EmptyMessageContainer>
  );
}

export default EmptyMessage;
