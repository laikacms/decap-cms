import React from 'react';
import { css, Global } from '@emotion/react';
import type { CSSObject, SerializedStyles } from '@emotion/react';

/**
 * Font Stacks
 */
interface Fonts {
  primary: string;
  mono: string;
}

const fonts: Fonts = {
  primary: `
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif,
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Segoe UI Symbol"
  `,
  mono: `
    'SFMono-Regular',
    Consolas,
    "Liberation Mono",
    Menlo,
    Courier,
    monospace;
  `,
};

/**
 * Theme Colors
 */
interface ColorsRaw {
  white: string;
  grayLight: string;
  gray: string;
  grayDark: string;
  blue: string;
  blueLight: string;
  green: string;
  greenLight: string;
  brown: string;
  yellow: string;
  red: string;
  redDark: string;
  redLight: string;
  purple: string;
  purpleLight: string;
  teal: string;
  tealDark: string;
  tealLight: string;
}

const colorsRaw: ColorsRaw = {
  white: '#fff',
  grayLight: '#eff0f4',
  gray: '#798291',
  grayDark: '#313d3e',
  blue: '#3a69c7',
  blueLight: '#e8f5fe',
  green: '#005614',
  greenLight: '#caef6f',
  brown: '#754e00',
  yellow: '#ffee9c',
  red: '#ff003b',
  redDark: '#D60032',
  redLight: '#fcefea',
  purple: '#70399f',
  purpleLight: '#f6d8ff',
  teal: '#17a2b8',
  tealDark: '#117888',
  tealLight: '#ddf5f9',
};

interface Colors {
  statusDraftText: string;
  statusDraftBackground: string;
  statusReviewText: string;
  statusReviewBackground: string;
  statusReadyText: string;
  statusReadyBackground: string;
  text: string;
  textLight: string;
  textLead: string;
  background: string;
  foreground: string;
  active: string;
  activeBackground: string;
  inactive: string;
  button: string;
  buttonText: string;
  inputBackground: string;
  infoText: string;
  infoBackground: string;
  successText: string;
  successBackground: string;
  warnText: string;
  warnBackground: string;
  errorText: string;
  errorBackground: string;
  textFieldBorder: string;
  controlLabel: string;
  checkerboardLight: string;
  checkerboardDark: string;
  mediaDraftText: string;
  mediaDraftBackground: string;
}

const colors: Colors = {
  statusDraftText: colorsRaw.purple,
  statusDraftBackground: colorsRaw.purpleLight,
  statusReviewText: colorsRaw.brown,
  statusReviewBackground: colorsRaw.yellow,
  statusReadyText: colorsRaw.green,
  statusReadyBackground: colorsRaw.greenLight,
  text: colorsRaw.gray,
  textLight: colorsRaw.white,
  textLead: colorsRaw.grayDark,
  background: colorsRaw.grayLight,
  foreground: colorsRaw.white,
  active: colorsRaw.blue,
  activeBackground: colorsRaw.blueLight,
  inactive: colorsRaw.gray,
  button: colorsRaw.grayDark,
  buttonText: colorsRaw.white,
  inputBackground: colorsRaw.white,
  infoText: colorsRaw.blue,
  infoBackground: colorsRaw.blueLight,
  successText: colorsRaw.green,
  successBackground: colorsRaw.greenLight,
  warnText: colorsRaw.brown,
  warnBackground: colorsRaw.yellow,
  errorText: colorsRaw.red,
  errorBackground: colorsRaw.redLight,
  textFieldBorder: '#dfdfe3',
  controlLabel: '#5D626F',
  checkerboardLight: '#f2f2f2',
  checkerboardDark: '#e6e6e6',
  mediaDraftText: colorsRaw.purple,
  mediaDraftBackground: colorsRaw.purpleLight,
};

interface Lengths {
  topBarHeight: string;
  inputPadding: string;
  borderRadius: string;
  richTextEditorMinHeight: string;
  borderWidth: string;
  topCardWidth: string;
  pageMargin: string;
  objectWidgetTopBarContainerPadding: string;
}

const lengths: Lengths = {
  topBarHeight: '56px',
  inputPadding: '16px 20px',
  borderRadius: '5px',
  richTextEditorMinHeight: '300px',
  borderWidth: '2px',
  topCardWidth: '682px',
  pageMargin: '28px 18px',
  objectWidgetTopBarContainerPadding: '0 14px 14px',
};

interface Borders {
  textField: string;
}

const borders: Borders = {
  textField: `solid  ${lengths.borderWidth} ${colors.textFieldBorder}`,
};

interface Transitions {
  main: string;
}

const transitions: Transitions = {
  main: '.2s ease',
};

interface Shadows {
  drop: string;
  dropMain: string;
  dropMiddle: string;
  dropDeep: string;
  inset: string;
}

const shadows: Shadows = {
  drop: `
    box-shadow: 0 2px 4px 0 rgba(19, 39, 48, 0.12);
  `,
  dropMain: `
    box-shadow: 0 2px 6px 0 rgba(68, 74, 87, 0.05), 0 1px 3px 0 rgba(68, 74, 87, 0.1);
  `,
  dropMiddle: `
    box-shadow: 0 2px 6px 0 rgba(68, 74, 87, 0.15), 0 1px 3px 0 rgba(68, 74, 87, 0.3);
  `,
  dropDeep: `
    box-shadow: 0 4px 12px 0 rgba(68, 74, 87, 0.15), 0 1px 3px 0 rgba(68, 74, 87, 0.25);
  `,
  inset: `
    box-shadow: inset 0 0 4px rgba(68, 74, 87, 0.3);
  `,
};

interface Text {
  fieldLabel: SerializedStyles;
}

const text: Text = {
  fieldLabel: css`
    font-size: 12px;
    text-transform: uppercase;
    font-weight: 600;
    color: ${colors.controlLabel};
  `,
};

interface Gradients {
  checkerboard: string;
}

const gradients: Gradients = {
  checkerboard: `
    linear-gradient(
      45deg,
      ${colors.checkerboardDark} 25%,
      transparent 25%,
      transparent 75%,
      ${colors.checkerboardDark} 75%,
      ${colors.checkerboardDark}
    )
  `,
};

interface Effects {
  checkerboard: SerializedStyles;
}

const effects: Effects = {
  checkerboard: css`
    background-color: ${colors.checkerboardLight};
    background-size: 16px 16px;
    background-position:
      0 0,
      8px 8px;
    background-image: ${gradients.checkerboard}, ${gradients.checkerboard};
  `,
};

const badge: SerializedStyles = css`
  font-size: 13px;
  line-height: 1;
`;

const backgroundBadge: SerializedStyles = css`
  ${badge};
  display: block;
  border-radius: ${lengths.borderRadius};
  padding: 4px 10px;
  text-align: center;
`;

const textBadge: SerializedStyles = css`
  ${badge};
  display: inline-block;
  font-weight: 700;
  text-transform: uppercase;
`;

const card: SerializedStyles = css`
  ${shadows.dropMain};
  border-radius: 5px;
  background-color: #fff;
`;

interface Buttons {
  button: SerializedStyles;
  default: SerializedStyles;
  widget: SerializedStyles;
  medium: SerializedStyles;
  small: SerializedStyles;
  gray: SerializedStyles;
  grayText: SerializedStyles;
  green: SerializedStyles;
  lightRed: SerializedStyles;
  lightBlue: SerializedStyles;
  lightTeal: SerializedStyles;
  teal: SerializedStyles;
  disabled: SerializedStyles;
}

const buttons: Buttons = {
  button: css`
    border: 0;
    border-radius: ${lengths.borderRadius};
    cursor: pointer;
  `,
  default: css`
    height: 36px;
    line-height: 36px;
    font-weight: 500;
    padding: 0 15px;
    background-color: ${colorsRaw.gray};
    color: ${colorsRaw.white};
  `,
  widget: css`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2px 12px;
    font-size: 12px;
    font-weight: bold;
    border-radius: 3px;
  `,
  medium: css`
    height: 27px;
    line-height: 27px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 3px;
    padding: 0 24px 0 14px;
  `,
  small: css`
    font-size: 13px;
    height: 23px;
    line-height: 23px;
  `,
  gray: css`
    background-color: ${colors.button};
    color: ${colors.buttonText};

    &:focus,
    &:hover {
      color: ${colorsRaw.white};
      background-color: #555a65;
    }
  `,
  grayText: css`
    background-color: transparent;
    color: ${colorsRaw.gray};
  `,
  green: css`
    background-color: #aae31f;
    color: ${colorsRaw.green};
  `,
  lightRed: css`
    background-color: ${colorsRaw.redLight};
    color: ${colorsRaw.redDark};
  `,
  lightBlue: css`
    background-color: ${colorsRaw.blueLight};
    color: ${colorsRaw.blue};
  `,
  lightTeal: css`
    background-color: ${colorsRaw.tealLight};
    color: #1195aa;
  `,
  teal: css`
    background-color: ${colorsRaw.teal};
    color: ${colorsRaw.white};
  `,
  disabled: css`
    background-color: ${colorsRaw.grayLight};
    color: ${colorsRaw.gray};
    cursor: default;
  `,
};

const caret: SerializedStyles = css`
  color: ${colorsRaw.white};
  width: 0;
  height: 0;
  border: 5px solid transparent;
  border-radius: 2px;
`;

interface Components {
  card: SerializedStyles;
  caretDown: SerializedStyles;
  caretRight: SerializedStyles;
  badge: SerializedStyles;
  badgeSuccess: SerializedStyles;
  badgeDanger: SerializedStyles;
  textBadge: SerializedStyles;
  textBadgeSuccess: SerializedStyles;
  textBadgeDanger: SerializedStyles;
  loaderSize: SerializedStyles;
  cardTop: SerializedStyles;
  cardTopHeading: SerializedStyles;
  cardTopDescription: SerializedStyles;
  objectWidgetTopBarContainer: SerializedStyles;
  dropdownList: SerializedStyles;
  dropdownItem: SerializedStyles;
  viewControlsText: SerializedStyles;
}

const components: Components = {
  card,
  caretDown: css`
    ${caret};
    border-top: 6px solid currentColor;
    border-bottom: 0;
  `,
  caretRight: css`
    ${caret};
    border-left: 6px solid currentColor;
    border-right: 0;
  `,
  badge: css`
    ${backgroundBadge};
    color: ${colors.infoText};
    background-color: ${colors.infoBackground};
  `,
  badgeSuccess: css`
    ${backgroundBadge};
    color: ${colors.successText};
    background-color: ${colors.successBackground};
  `,
  badgeDanger: css`
    ${backgroundBadge};
    color: ${colorsRaw.red};
    background-color: #fbe0d7;
  `,
  textBadge: css`
    ${textBadge};
    color: ${colors.infoText};
  `,
  textBadgeSuccess: css`
    ${textBadge};
    color: ${colors.successText};
  `,
  textBadgeDanger: css`
    ${textBadge};
    color: ${colorsRaw.red};
  `,
  loaderSize: css`
    width: 2.2857rem;
    height: 2.2857rem;
  `,
  cardTop: css`
    ${card};
    width: ${lengths.topCardWidth};
    max-width: 100%;
    padding: 18px 20px;
    margin-bottom: 28px;
  `,
  cardTopHeading: css`
    font-size: 22px;
    font-weight: 600;
    line-height: 37px;
    margin: 0;
    padding: 0;
  `,
  cardTopDescription: css`
    max-width: 480px;
    color: ${colors.text};
    font-size: 14px;
    margin-top: 8px;
  `,
  objectWidgetTopBarContainer: css`
    padding: ${lengths.objectWidgetTopBarContainerPadding};
  `,
  dropdownList: css`
    ${shadows.dropDeep};
    background-color: ${colorsRaw.white};
    border-radius: ${lengths.borderRadius};
    overflow: hidden;
  `,
  dropdownItem: css`
    ${buttons.button};
    background-color: transparent;
    border-radius: 0;
    color: ${colorsRaw.grayDark};
    font-weight: 500;
    border-bottom: 1px solid #eaebf1;
    padding: 8px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: max-content;

    &:last-of-type {
      border-bottom: 0;
    }

    &.active,
    &:hover,
    &:active,
    &:focus {
      color: ${colors.active};
      background-color: ${colors.activeBackground};
    }
  `,
  viewControlsText: css`
    font-size: 14px;
    color: ${colors.text};
    margin-right: 12px;
    white-space: nowrap;
  `,
};

interface ReactSelectStylesState {
  isSelected?: boolean;
  isFocused?: boolean;
  hasValue?: boolean;
  selectProps?: {
    isClearable?: boolean;
  };
}

interface ReactSelectStyles {
  control: (styles: CSSObject) => CSSObject;
  option: (styles: CSSObject, state: ReactSelectStylesState) => CSSObject;
  menu: (styles: CSSObject) => CSSObject;
  container: (styles: CSSObject) => CSSObject;
  indicatorSeparator: (styles: CSSObject, state: ReactSelectStylesState) => CSSObject;
  dropdownIndicator: (styles: CSSObject) => CSSObject;
  clearIndicator: (styles: CSSObject) => CSSObject;
  multiValue: (styles: CSSObject) => CSSObject;
  multiValueLabel: (styles: CSSObject) => CSSObject;
  multiValueRemove: (styles: CSSObject) => CSSObject;
}

const reactSelectStyles: ReactSelectStyles = {
  control: (styles: CSSObject): CSSObject => ({
    ...styles,
    border: 0,
    boxShadow: 'none',
    padding: '9px 0 9px 12px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  option: (styles: CSSObject, state: ReactSelectStylesState): CSSObject => ({
    ...styles,
    backgroundColor: state.isSelected
      ? `${colors.active}`
      : state.isFocused
        ? `${colors.activeBackground}`
        : 'transparent',
    paddingLeft: '22px',
  }),
  menu: (styles: CSSObject): CSSObject => ({ ...styles, right: 0, zIndex: zIndex.zIndex300 }),
  container: (styles: CSSObject): CSSObject => ({ ...styles, padding: '0 !important' }),
  indicatorSeparator: (styles: CSSObject, state: ReactSelectStylesState): CSSObject =>
    state.hasValue && state.selectProps?.isClearable
      ? { ...styles, backgroundColor: `${colors.textFieldBorder}` }
      : { display: 'none' },
  dropdownIndicator: (styles: CSSObject): CSSObject => ({
    ...styles,
    color: `${colors.controlLabel}`,
  }),
  clearIndicator: (styles: CSSObject): CSSObject => ({
    ...styles,
    color: `${colors.controlLabel}`,
  }),
  multiValue: (styles: CSSObject): CSSObject => ({
    ...styles,
    backgroundColor: colors.background,
  }),
  multiValueLabel: (styles: CSSObject): CSSObject => ({
    ...styles,
    color: colors.textLead,
    fontWeight: 500,
  }),
  multiValueRemove: (styles: CSSObject): CSSObject => ({
    ...styles,
    color: colors.controlLabel,
    ':hover': {
      color: colors.errorText,
      backgroundColor: colors.errorBackground,
    },
  }),
};

interface ZIndex {
  zIndex0: number;
  zIndex1: number;
  zIndex2: number;
  zIndex10: number;
  zIndex100: number;
  zIndex200: number;
  zIndex299: number;
  zIndex300: number;
  zIndex1000: number;
  zIndex10000: number;
  zIndex99999: number;
}

const zIndex: ZIndex = {
  zIndex0: 0,
  zIndex1: 1,
  zIndex2: 2,
  zIndex10: 10,
  zIndex100: 100,
  zIndex200: 200,
  zIndex299: 299,
  zIndex300: 300,
  zIndex1000: 1000,
  zIndex10000: 10000,
  zIndex99999: 99999,
};

function GlobalStyles(): React.ReactElement {
  return (
    <Global
      styles={css`
        *,
        *:before,
        *:after {
          box-sizing: border-box;
        }

        :focus {
          outline: -webkit-focus-ring-color auto ${lengths.borderRadius};
        }

        /**
       * Don't show outlines if the user is utilizing mouse rather than keyboard.
       */
        [data-whatintent='mouse'] *:focus {
          outline: none;
        }

        input {
          border: 0;
        }

        body {
          font-family: ${fonts.primary};
          font-weight: normal;
          background-color: ${colors.background};
          color: ${colors.text};
          margin: 0;
        }

        ul,
        ol {
          padding-left: 0;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        p {
          font-family: ${fonts.primary};
          color: ${colors.textLead};
          font-size: 15px;
          line-height: 1.5;
          margin-top: 0;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          font-weight: 500;
        }

        h1 {
          font-size: 24px;
          letter-spacing: 0.4px;
          color: ${colors.textLead};
        }

        a,
        button {
          font-size: 14px;
          font-weight: 500;
        }

        a {
          color: ${colors.text};
          text-decoration: none;
        }

        button {
          font-family: inherit;
        }

        img {
          max-width: 100%;
        }

        textarea {
          resize: none;
        }
      `}
    />
  );
}

export {
  fonts,
  colorsRaw,
  colors,
  lengths,
  components,
  buttons,
  text,
  shadows,
  borders,
  transitions,
  effects,
  zIndex,
  reactSelectStyles,
  GlobalStyles,
};

export type {
  Fonts,
  ColorsRaw,
  Colors,
  Lengths,
  Borders,
  Transitions,
  Shadows,
  Text,
  Effects,
  Buttons,
  Components,
  ZIndex,
  ReactSelectStyles,
};
