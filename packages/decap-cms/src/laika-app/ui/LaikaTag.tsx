/** @jsxImportSource @emotion/react */
import styled from '@emotion/styled';
import React from 'react';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';

/**
 * Compact rectangular label — distinct from `LaikaBadge` (which is a pill).
 * Used for static keywords, categories, file types, or content groups.
 * Optional `onRemove` turns it into a removable chip.
 */

const Box = styled('span', { shouldForwardProp: laikaShouldForwardProp })<{
  $removable?: boolean,
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px ${({ $removable }) => ($removable ? '4px' : '6px')} 2px 6px;
  border-radius: 4px;
  background-color: ${colors.activeBackground};
  color: ${colors.controlLabel};
  line-height: 1.4;
  border: 1px solid ${colors.textFieldBorder};
`;

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${colors.controlLabel};
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  font-family: inherit;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${colors.errorText};
    background-color: ${colors.errorBackground};
    outline: none;
  }
`;

export interface LaikaTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** When supplied, renders a small × button. */
  onRemove?: () => void;
  /** Accessible label for the remove button. Default "Remove". */
  removeLabel?: string;
  children?: React.ReactNode;
}

function LaikaTag({ children, onRemove, removeLabel = 'Remove', ...rest }: LaikaTagProps) {
  return (
    <Box $removable={!!onRemove} {...rest}>
      <span>{children}</span>
      {onRemove
        ? (
          <RemoveButton type="button" aria-label={removeLabel} onClick={onRemove}>
            ×
          </RemoveButton>
        )
        : null}
    </Box>
  );
}

export default LaikaTag;
