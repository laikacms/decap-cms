import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import * as React from 'react';

import { css, type WithClassName } from './styled';

/**
 * Rounded avatar built on Base UI's `Avatar`. When `src` is supplied and the
 * image loads, renders it cropped to a circle. Otherwise falls back to the
 * first letter of `name` (or `?` when no name is set) over the
 * active-background tint. Base UI tracks the image loading status, so the
 * fallback appears automatically while loading and on load errors.
 *
 * Colors are inlined as `--decap-color-*` custom properties (the same
 * variables `src/ui/default/styles.tsx`'s `colors` token layer resolves to)
 * with literal fallbacks, rather than importing that module directly — layer
 * 1 (`src/ui/`) must not depend on layer 2 (`src/ui/default/`), see
 * `src/ui/README.md`. The fallback keeps this themeable and correct even
 * outside a `DecapCmsProvider`.
 */

export type AvatarSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<AvatarSize, { box: string, font: string }> = {
  sm: { box: '24px', font: '11px' },
  md: { box: '36px', font: '14px' },
  lg: { box: '56px', font: '20px' },
};

function rootClass(size: AvatarSize) {
  return css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${sizeMap[size].box};
    height: ${sizeMap[size].box};
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background-color: var(--decap-color-activeBackground, #e8f5fe);
    color: var(--decap-color-active, #3a69c7);
    font-size: ${sizeMap[size].font};
    font-weight: 600;
    user-select: none;
  `;
}

const imageClass = css`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export interface AvatarProps extends WithClassName<Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>> {
  size?: AvatarSize;
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

export function Avatar(
  { size = 'md', src, name, alt, className, ...rest }: AvatarProps,
): React.ReactNode {
  const accessibleAlt = alt ?? name ?? 'Avatar';

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      css={rootClass(size)}
      className={className}
      {...rest}
    >
      {src ? <AvatarPrimitive.Image css={imageClass} src={src} alt={accessibleAlt} /> : null}
      <AvatarPrimitive.Fallback aria-label={accessibleAlt}>{initial(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
