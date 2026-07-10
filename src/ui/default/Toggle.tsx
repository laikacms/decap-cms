import React, { useState } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

import { colors, colorsRaw, shadows, transitions } from './styles';
import { laikaShouldForwardProp } from '../laika-app/ui/styled-utils';

export interface ToggleActiveProps {
  $isActive?: boolean;
}

const ToggleContainer = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 40px;
  height: 20px;
  cursor: pointer;
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
`;

const ToggleHandle = styled('span', { shouldForwardProp: laikaShouldForwardProp })<ToggleActiveProps>`
  ${shadows.dropDeep};
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${colorsRaw.white};
  transition: transform ${transitions.main};

  ${(props: ToggleActiveProps) =>
    props.$isActive &&
    css`
      transform: translateX(20px);
    `};
`;

const ToggleBackground = styled('span', {
  shouldForwardProp: laikaShouldForwardProp,
})<ToggleActiveProps>`
  width: 34px;
  height: 14px;
  border-radius: 10px;
  background-color: ${colors.active};
`;

export type ToggleContainerComponent = typeof ToggleContainer;
export type ToggleBackgroundComponent = typeof ToggleBackground;
export type ToggleHandleComponent = typeof ToggleHandle;

export interface ToggleProps {
  id?: string;
  active?: boolean;
  onChange?: (isActive: boolean) => void;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  className?: string;
  Container?: React.ComponentType<React.ComponentProps<typeof ToggleContainer>>;
  Background?: React.ComponentType<ToggleActiveProps>;
  Handle?: React.ComponentType<ToggleActiveProps>;
}

function Toggle({
  id,
  active,
  onChange,
  onFocus,
  onBlur,
  className,
  Container = ToggleContainer,
  Background = ToggleBackground,
  Handle = ToggleHandle,
}: ToggleProps): React.ReactElement {
  const [isActive, setIsActive] = useState<boolean | undefined>(active);

  function handleToggle(): void {
    setIsActive((prevIsActive: boolean | undefined) => !prevIsActive);
    if (onChange) {
      onChange(!isActive);
    }
  }

  return (
    <Container
      id={id}
      onFocus={onFocus}
      onBlur={onBlur}
      className={className}
      onClick={handleToggle}
      role="switch"
      aria-checked={isActive ? 'true' : 'false'}
      aria-expanded={undefined}
    >
      <Background $isActive={isActive} />
      <Handle $isActive={isActive} />
    </Container>
  );
}

const StyledToggle = styled(Toggle)``;

export { StyledToggle as default, ToggleContainer, ToggleBackground, ToggleHandle };
