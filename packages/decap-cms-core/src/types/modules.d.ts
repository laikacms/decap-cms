// Declaration for the 'url' polyfill package
declare module 'url' {
  interface UrlObject {
    protocol?: string | null;
    slashes?: boolean | null;
    auth?: string | null;
    host?: string | null;
    port?: string | null;
    hostname?: string | null;
    hash?: string | null;
    search?: string | null;
    query?: string | { [key: string]: string | string[] } | null;
    pathname?: string | null;
    path?: string | null;
    href?: string | null;
  }

  export function parse(urlString: string, parseQueryString?: boolean, slashesDenoteHost?: boolean): UrlObject;
  export function format(urlObject: UrlObject): string;
  export function resolve(from: string, to: string): string;
}

// Declaration for decap-cms-ui-default
declare module 'decap-cms-ui-default' {
  import type { ComponentType, ReactNode, CSSProperties } from 'react';
  
  export interface LoaderProps {
    active?: boolean;
    children?: ReactNode;
  }
  
  export const Loader: ComponentType<LoaderProps>;
  
  export interface IconProps {
    type: string;
    size?: string | number;
    className?: string;
    style?: CSSProperties;
  }
  
  export const Icon: ComponentType<IconProps>;
  
  export interface DropdownProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export const Dropdown: ComponentType<DropdownProps>;
  export const DropdownItem: ComponentType<DropdownProps>;
  export const DropdownButton: ComponentType<DropdownProps>;
  export const StyledDropdownButton: ComponentType<DropdownProps>;
  
  export interface ToggleProps {
    active?: boolean;
    onChange?: (active: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export const Toggle: ComponentType<ToggleProps>;
  
  export const colors: {
    [key: string]: string;
  };
  
  export const colorsRaw: {
    [key: string]: string;
  };
  
  export const lengths: {
    [key: string]: string;
  };
  
  export const components: {
    [key: string]: string;
  };
  
  export const buttons: {
    [key: string]: string;
  };
  
  export const shadows: {
    [key: string]: string;
  };
  
  export const borders: {
    [key: string]: string;
  };
  
  export const transitions: {
    [key: string]: string;
  };
  
  export const effects: {
    [key: string]: string;
  };
  
  export const zIndex: {
    [key: string]: number;
  };
  
  export const reactSelectStyles: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  
  export const GlobalStyles: ComponentType;
  
  export const ObjectWidgetTopBar: ComponentType<{
    allowAdd?: boolean;
    onAdd?: () => void;
    onAddType?: (type: string) => void;
    onCollapseToggle?: () => void;
    collapsed?: boolean;
    heading?: ReactNode;
    label?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    types?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
  
  export const ListItemTopBar: ComponentType<{
    collapsed?: boolean;
    onCollapseToggle?: () => void;
    onRemove?: () => void;
    dragHandleHOC?: ComponentType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
  
  export const FieldLabel: ComponentType<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
}
