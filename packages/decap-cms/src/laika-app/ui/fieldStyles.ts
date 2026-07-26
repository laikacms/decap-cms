import { css } from '@emotion/react';

import { colors } from '@/ui/default/index';

export const laikaFieldStyles = css`
  width: 100%;
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.inputBackground};
  color: ${colors.textLead};
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  outline: none;

  &::placeholder {
    color: ${colors.controlLabel};
  }

  &:hover {
    border-color: ${colors.active};
  }

  &:focus,
  &:focus-visible {
    border-color: ${colors.active};
    box-shadow: 0 0 0 3px ${colors.activeBackground};
  }

  &[aria-invalid='true'] {
    border-color: ${colors.errorText};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
