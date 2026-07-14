/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';

import { Icon, colors } from '@/ui/default/index';

/**
 * Search-styled text input with a leading search icon. Used by
 * LaikaCollectionSearch (sidebar) and any future command-palette / global
 * search surfaces. Inherits colors from the design tokens so it follows
 * dark mode automatically.
 */

const Wrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const IconBox = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${colors.controlLabel};
  pointer-events: none;
`;

const Input = styled.input`
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  border-radius: 9999px;
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.inputBackground};
  color: ${colors.textLead};
  font-family: inherit;
  font-size: 13px;
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
`;

export type LaikaSearchInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const LaikaSearchInput = React.forwardRef<HTMLInputElement, LaikaSearchInputProps>(
  function LaikaSearchInput(props, ref) {
    return (
      <Wrap>
        <IconBox>
          <Icon type="search" />
        </IconBox>
        <Input ref={ref} type="search" {...props} />
      </Wrap>
    );
  },
);

export default LaikaSearchInput;
