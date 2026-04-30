// Type declarations for external modules

// SVG imports
declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}

// react-transition-group types
declare module 'react-transition-group' {
  import type { ComponentType, ReactNode } from 'react';

  export interface CSSTransitionClassNames {
    appear?: string;
    appearActive?: string;
    appearDone?: string;
    enter?: string;
    enterActive?: string;
    enterDone?: string;
    exit?: string;
    exitActive?: string;
    exitDone?: string;
  }

  export interface CSSTransitionProps {
    in?: boolean;
    appear?: boolean;
    enter?: boolean;
    exit?: boolean;
    mountOnEnter?: boolean;
    unmountOnExit?: boolean;
    classNames?: string | CSSTransitionClassNames;
    timeout: number | { appear?: number; enter?: number; exit?: number };
    onEnter?: (node: HTMLElement, isAppearing: boolean) => void;
    onEntering?: (node: HTMLElement, isAppearing: boolean) => void;
    onEntered?: (node: HTMLElement, isAppearing: boolean) => void;
    onExit?: (node: HTMLElement) => void;
    onExiting?: (node: HTMLElement) => void;
    onExited?: (node: HTMLElement) => void;
    children?: ReactNode;
    nodeRef?: React.RefObject<HTMLElement>;
  }

  export const CSSTransition: ComponentType<CSSTransitionProps>;
  export const TransitionGroup: ComponentType<{
    component?: string | ComponentType | null;
    children?: ReactNode;
    appear?: boolean;
    enter?: boolean;
    exit?: boolean;
  }>;
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
