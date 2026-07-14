// Type declarations for external modules

// SVG imports
declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}

// react-aria-menubutton types
declare module 'react-aria-menubutton' {
  import type { ComponentType, ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react';

  export interface WrapperProps extends HTMLAttributes<HTMLDivElement> {
    onSelection?: (value: unknown, event: React.SyntheticEvent) => void;
    closeOnSelection?: boolean;
    closeOnBlur?: boolean;
    tag?: string;
    children?: ReactNode;
  }

  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    tag?: string;
    children?: ReactNode;
  }

  export interface MenuProps extends HTMLAttributes<HTMLDivElement> {
    tag?: string;
    children?: ReactNode;
  }

  export interface MenuItemProps extends HTMLAttributes<HTMLDivElement> {
    tag?: string;
    value?: unknown;
    text?: string;
    children?: ReactNode;
  }

  export const Wrapper: ComponentType<WrapperProps>;
  export const Button: ComponentType<ButtonProps>;
  export const Menu: ComponentType<MenuProps>;
  export const MenuItem: ComponentType<MenuItemProps>;
}
