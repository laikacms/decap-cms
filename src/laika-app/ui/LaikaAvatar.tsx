/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from './styled-utils';

/**
 * Rounded avatar. When `src` is supplied and the image loads, renders it
 * cropped to a circle. Otherwise falls back to the first letter of `name`
 * (or `?` when no name is set) over the active-background tint.
 */

export type LaikaAvatarSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<LaikaAvatarSize, { box: string; font: string }> = {
  sm: { box: '24px', font: '11px' },
  md: { box: '36px', font: '14px' },
  lg: { box: '56px', font: '20px' },
};

const Circle = styled('span', { shouldForwardProp: laikaShouldForwardProp })<{
  $size: LaikaAvatarSize;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => sizeMap[$size].box};
  height: ${({ $size }) => sizeMap[$size].box};
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background-color: ${colors.activeBackground};
  color: ${colors.active};
  font-size: ${({ $size }) => sizeMap[$size].font};
  font-weight: 600;
  user-select: none;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export interface LaikaAvatarProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  size?: LaikaAvatarSize;
  src?: string;
  name?: string;
  alt?: string;
}

function initial(name?: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function LaikaAvatar({ size = 'md', src, name, alt, ...rest }: LaikaAvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const showImage = !!src && !errored;
  const accessibleAlt = alt ?? name ?? 'Avatar';

  return (
    <Circle $size={size} aria-label={!showImage ? accessibleAlt : undefined} {...rest}>
      {showImage ? (
        <Image src={src} alt={accessibleAlt} onError={() => setErrored(true)} />
      ) : (
        initial(name)
      )}
    </Circle>
  );
}

export default LaikaAvatar;
