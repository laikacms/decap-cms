declare module 'decap-cms-ui-default' {
  import type { ComponentType, ReactNode, HTMLAttributes } from 'react';

  // Styles
  export const fonts: {
    primary: string;
    mono: string;
  };

  export const colorsRaw: Record<string, string>;
  export const colors: Record<string, string>;

  export const lengths: {
    topBarHeight: string;
    inputPadding: string;
    borderRadius: string;
    richTextEditorMinHeight: string;
    borderWidth: string;
    topCardWidth: string;
    pageMargin: string;
    objectWidgetTopBarContainerHeight: string;
    [key: string]: string;
  };

  export const components: Record<string, any>;
  export const buttons: Record<string, any>;
  export const text: Record<string, any>;
  export const shadows: Record<string, string>;
  export const borders: Record<string, string>;
  export const transitions: Record<string, string>;
  export const effects: Record<string, any>;

  export const zIndex: {
    zIndex1: number;
    zIndex2: number;
    zIndex3: number;
    zIndex10: number;
    zIndex100: number;
    zIndex200: number;
    zIndex299: number;
    zIndex300: number;
    zIndex1000: number;
    zIndex10000: number;
    zIndex99999: number;
    [key: string]: number;
  };

  export const reactSelectStyles: Record<string, any>;
  export const GlobalStyles: ComponentType;

  // Components
  export const Dropdown: ComponentType<any>;
  export const DropdownItem: ComponentType<any>;
  export const DropdownCheckedItem: ComponentType<any>;
  export const DropdownButton: ComponentType<any>;
  export const StyledDropdownButton: ComponentType<any>;
  export const Icon: ComponentType<{ type: string; size?: string; className?: string }>;
  export const ListItemTopBar: ComponentType<any>;
  export const Loader: ComponentType<any>;
  export const FieldLabel: ComponentType<any>;
  export const IconButton: ComponentType<any>;
  export const Toggle: ComponentType<any>;
  export const ToggleContainer: ComponentType<any>;
  export const ToggleBackground: ComponentType<any>;
  export const ToggleHandle: ComponentType<any>;
  export const AuthenticationPage: ComponentType<any>;
  export const WidgetPreviewContainer: ComponentType<
    HTMLAttributes<HTMLDivElement> & { children?: ReactNode }
  >;
  export const ObjectWidgetTopBar: ComponentType<any>;
  export const GoBackButton: ComponentType<any>;
  export function renderPageLogo(logoUrl?: string): ReactNode;

  export const DecapCmsUiDefault: {
    Dropdown: typeof Dropdown;
    DropdownItem: typeof DropdownItem;
    DropdownCheckedItem: typeof DropdownCheckedItem;
    DropdownButton: typeof DropdownButton;
    StyledDropdownButton: typeof StyledDropdownButton;
    ListItemTopBar: typeof ListItemTopBar;
    FieldLabel: typeof FieldLabel;
    Icon: typeof Icon;
    IconButton: typeof IconButton;
    Loader: typeof Loader;
    Toggle: typeof Toggle;
    ToggleContainer: typeof ToggleContainer;
    ToggleBackground: typeof ToggleBackground;
    ToggleHandle: typeof ToggleHandle;
    AuthenticationPage: typeof AuthenticationPage;
    WidgetPreviewContainer: typeof WidgetPreviewContainer;
    ObjectWidgetTopBar: typeof ObjectWidgetTopBar;
    fonts: typeof fonts;
    colorsRaw: typeof colorsRaw;
    colors: typeof colors;
    lengths: typeof lengths;
    components: typeof components;
    buttons: typeof buttons;
    shadows: typeof shadows;
    text: typeof text;
    borders: typeof borders;
    transitions: typeof transitions;
    effects: typeof effects;
    zIndex: typeof zIndex;
    reactSelectStyles: typeof reactSelectStyles;
    GlobalStyles: typeof GlobalStyles;
    renderPageLogo: typeof renderPageLogo;
  };
}
