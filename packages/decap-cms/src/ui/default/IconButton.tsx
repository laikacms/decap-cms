import styled from '@emotion/styled';
import React from 'react';

import { laikaShouldForwardProp } from '@/ui/styled';
import Icon from './Icon';
import { buttons, colors, colorsRaw, shadows } from './styles';

import type { IconName } from './Icon/icons';

type IconButtonSize = 'small' | 'large';

const sizes: Record<IconButtonSize, string> = {
  small: '28px',
  large: '40px',
};

interface ButtonRoundProps {
  size: IconButtonSize;
  $isActive?: boolean;
}

const ButtonRound = styled('button', { shouldForwardProp: laikaShouldForwardProp })<ButtonRoundProps>`
  ${buttons.button};
  ${shadows.dropMiddle};
  background-color: ${colorsRaw.white};
  color: ${(props: ButtonRoundProps) => colors[props.$isActive ? 'active' : 'inactive']};
  border-radius: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${(props: ButtonRoundProps) => sizes[props.size]};
  height: ${(props: ButtonRoundProps) => sizes[props.size]};
  padding: 0;
`;

export interface IconButtonProps {
  size: IconButtonSize;
  isActive?: boolean;
  type: IconName;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  title?: string;
}

function IconButton({
  size,
  isActive,
  type,
  onClick,
  className,
  title,
}: IconButtonProps): React.ReactElement {
  return (
    <ButtonRound
      size={size}
      $isActive={isActive}
      className={className}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <Icon type={type} size={size} />
    </ButtonRound>
  );
}

export default IconButton;
