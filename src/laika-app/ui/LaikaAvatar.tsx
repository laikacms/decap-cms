/** @jsxImportSource @emotion/react */
import { Avatar } from '@base-ui/react/avatar';
import React from 'react';
import styled from '@emotion/styled';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';

/**
 * Rounded avatar built on Base UI's `Avatar`. When `src` is supplied and the
 * image loads, renders it cropped to a circle. Otherwise falls back to the
 * first letter of `name` (or `?` when no name is set) over the
 * active-background tint. Base UI tracks the image loading status, so the
 * fallback appears automatically while loading and on load errors.
 */

export type LaikaAvatarSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<LaikaAvatarSize, { box: string; font: string }> = {
  sm: { box: '24px', font: '11px' },
  md: { box: '36px', font: '14px' },
  lg: { box: '56px', font: '20px' },
};

const Circle = styled(Avatar.Root, { shouldForwardProp: laikaShouldForwardProp })<{
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

const Image = styled(Avatar.Image)`
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
  const accessibleAlt = alt ?? name ?? 'Avatar';

  return (
    <Circle $size={size} {...rest}>
      {src ? <Image src={src} alt={accessibleAlt} /> : null}
      <Avatar.Fallback aria-label={accessibleAlt}>{initial(name)}</Avatar.Fallback>
    </Circle>
  );
}

export default LaikaAvatar;
