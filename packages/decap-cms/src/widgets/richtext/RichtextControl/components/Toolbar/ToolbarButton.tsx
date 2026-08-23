import styled from '@emotion/styled';

import { buttons, Icon } from '@/ui/default/index';

import type { IconName } from '@/ui/default/Icon/icons';
import type { MouseEvent } from 'react';

interface StyledToolbarButtonProps {
  isActive?: boolean | undefined;
}

const StyledToolbarButton = styled.button<StyledToolbarButtonProps>`
  ${buttons.button};
  display: inline-block;
  padding: 4px;
  margin: 2px;
  border: none;
  background-color: ${props => (props.isActive ? '#e8f5fe' : 'transparent')};
  font-size: 16px;
  color: ${props => (props.isActive ? '#3a69c7' : 'inherit')};
  cursor: pointer;

  &:disabled {
    cursor: auto;
    opacity: 0.5;
  }

  ${Icon} {
    display: block;
  }
`;

export interface ToolbarButtonProps {
  type?: string | undefined;
  label: string;
  icon?: IconName | undefined;
  onClick?: ((event: MouseEvent<HTMLButtonElement>, type?: string | undefined) => void) | undefined;
  isActive?: boolean | undefined;
  disabled?: boolean | undefined;
}

export default function ToolbarButton({
  type,
  label,
  icon,
  onClick,
  isActive,
  disabled,
}: ToolbarButtonProps) {
  return (
    <StyledToolbarButton
      isActive={isActive}
      onClick={event => onClick && onClick(event, type)}
      onMouseDown={event => event.preventDefault()}
      title={label}
      disabled={disabled}
    >
      {icon ? <Icon type={icon} /> : label}
    </StyledToolbarButton>
  );
}
