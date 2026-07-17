/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';
import { Link } from 'react-router-dom';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';

/**
 * Laika's primary button primitive. Four intents (`primary`, `secondary`,
 * `ghost`, `danger`) × two sizes (`md`, `sm`). Renders a `<button>` by
 * default, or a `react-router` `Link` when `to` is supplied.
 *
 * The equivalent of Daniel-Mendes's `decap-cms-ui-next` Button — but living
 * entirely inside laika-app, so the rest of Decap stays untouched.
 */

export type LaikaButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type LaikaButtonSize = 'md' | 'sm';

const sizeStyles: Record<LaikaButtonSize, ReturnType<typeof css>> = {
  md: css`
    height: 36px;
    padding: 0 16px;
    font-size: 14px;
  `,
  sm: css`
    height: 28px;
    padding: 0 12px;
    font-size: 13px;
  `,
};

const variantStyles: Record<LaikaButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background-color: ${colors.button};
    color: ${colors.buttonText};
    border: 1px solid transparent;
    &:hover,
    &:focus-visible {
      background-color: ${colors.active};
    }
  `,
  secondary: css`
    background-color: ${colors.activeBackground};
    color: ${colors.active};
    border: 1px solid transparent;
    &:hover,
    &:focus-visible {
      background-color: ${colors.active};
      color: ${colors.foreground};
    }
  `,
  ghost: css`
    background-color: transparent;
    color: ${colors.controlLabel};
    border: 1px solid transparent;
    &:hover,
    &:focus-visible {
      background-color: ${colors.activeBackground};
      color: ${colors.active};
    }
  `,
  danger: css`
    background-color: ${colors.errorBackground};
    color: ${colors.errorText};
    border: 1px solid transparent;
    &:hover,
    &:focus-visible {
      background-color: ${colors.errorText};
      color: ${colors.foreground};
    }
  `,
};

const baseStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 9999px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  white-space: nowrap;
  user-select: none;

  &:disabled,
  &[aria-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const buttonCss = ({
  variant = 'primary',
  buttonSize = 'md',
  $fullWidth,
}: {
  variant?: LaikaButtonVariant,
  buttonSize?: LaikaButtonSize,
  $fullWidth?: boolean,
}) =>
  css`
  ${baseStyles};
  ${sizeStyles[buttonSize]};
  ${variantStyles[variant]};
  ${
    $fullWidth
      ? css`
        width: 100%;
      `
      : ''
  };
`;

const StyledButton = styled('button', { shouldForwardProp: laikaShouldForwardProp })<{
  variant?: LaikaButtonVariant,
  buttonSize?: LaikaButtonSize,
  $fullWidth?: boolean,
}>`
  ${props => buttonCss(props)};
`;

const StyledLink = styled(Link, {
  shouldForwardProp: prop => laikaShouldForwardProp(prop) || prop === 'to',
})<{
  variant?: LaikaButtonVariant,
  buttonSize?: LaikaButtonSize,
  $fullWidth?: boolean,
}>`
  ${props => buttonCss(props)};
`;

export interface LaikaButtonOwnProps {
  variant?: LaikaButtonVariant;
  size?: LaikaButtonSize;
  fullWidth?: boolean;
  /** Renders as a `react-router` Link when supplied; ignores button-specific props. */
  to?: string;
  children?: React.ReactNode;
}

export type LaikaButtonProps =
  | (LaikaButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined })
  | (LaikaButtonOwnProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string });

const LaikaButton = React.forwardRef<HTMLElement, LaikaButtonProps>(function LaikaButton(
  { variant = 'primary', size = 'md', fullWidth, to, children, ...rest },
  ref,
) {
  if (typeof to === 'string') {
    return (
      <StyledLink
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={to}
        variant={variant}
        buttonSize={size}
        $fullWidth={fullWidth}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </StyledLink>
    );
  }
  return (
    <StyledButton
      ref={ref as React.Ref<HTMLButtonElement>}
      type={(rest as React.ButtonHTMLAttributes<HTMLButtonElement>).type ?? 'button'}
      variant={variant}
      buttonSize={size}
      $fullWidth={fullWidth}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </StyledButton>
  );
});

export default LaikaButton;
