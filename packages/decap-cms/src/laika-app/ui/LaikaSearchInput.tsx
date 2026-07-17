/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { colors, Icon } from '@/ui/default/index';

/**
 * Search-styled field in two flavors sharing one look:
 *
 * - `LaikaSearchInput`: a real text input with a leading search icon. Used
 *   by the command palette (LaikaCommandPalette) and any future search
 *   surfaces. Inherits colors from the design tokens so it follows dark
 *   mode automatically.
 * - `LaikaSearchTrigger`: a button dressed as the same field. Used by
 *   LaikaCollectionSearch (sidebar) to open the command palette — the
 *   single search entry point — with an optional shortcut chip (e.g. ⌘K)
 *   on the right.
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

const fieldStyles = css`
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

  &:hover {
    border-color: ${colors.active};
  }

  &:focus,
  &:focus-visible {
    border-color: ${colors.active};
    box-shadow: 0 0 0 3px ${colors.activeBackground};
  }
`;

const Input = styled.input`
  ${fieldStyles};

  &::placeholder {
    color: ${colors.controlLabel};
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

const TriggerButton = styled.button`
  ${fieldStyles};
  /* Reserve room for the shortcut chip. */
  padding-right: 44px;
  display: block;
  text-align: left;
  cursor: pointer;
  /* The label reads as placeholder text: the "value" is typed in the
     palette this button opens, never here. */
  color: ${colors.controlLabel};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ShortcutChip = styled.kbd`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.background};
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  color: ${colors.controlLabel};
  /* Clicks fall through to the trigger button underneath. */
  pointer-events: none;
`;

export type LaikaSearchTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Placeholder-style text shown inside the field. */
  label: React.ReactNode,
  /** Optional shortcut chip content, e.g. "⌘K". */
  shortcut?: React.ReactNode,
};

export const LaikaSearchTrigger = React.forwardRef<HTMLButtonElement, LaikaSearchTriggerProps>(
  function LaikaSearchTrigger({ label, shortcut, ...props }, ref) {
    return (
      <Wrap>
        <IconBox>
          <Icon type="search" />
        </IconBox>
        <TriggerButton ref={ref} type="button" {...props}>
          {label}
        </TriggerButton>
        {shortcut ? <ShortcutChip>{shortcut}</ShortcutChip> : null}
      </Wrap>
    );
  },
);
