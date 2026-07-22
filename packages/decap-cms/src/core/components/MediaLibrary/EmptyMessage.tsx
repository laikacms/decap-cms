import styled from '@emotion/styled';
import React from 'react';

import { colors } from '@/ui/default/index';

const EmptyMessageContainer = styled.div<{ $isPrivate?: boolean }>`
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-wrap: anywhere;
  padding: 0 20px;
  color: ${props => props.$isPrivate && colors.textFieldBorder};
`;

const EmptyMessageText = styled.p`
  margin: 0;
  font-size: 2em;
  font-weight: bold;
`;

interface EmptyMessageProps {
  content: string;
  isPrivate?: boolean;
}

function EmptyMessage({ content, isPrivate }: EmptyMessageProps) {
  return (
    <EmptyMessageContainer $isPrivate={isPrivate}>
      <EmptyMessageText role="status" aria-live="polite">
        {content}
      </EmptyMessageText>
    </EmptyMessageContainer>
  );
}

export default EmptyMessage;
