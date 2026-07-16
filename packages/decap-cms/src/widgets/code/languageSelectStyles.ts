import { borders, reactSelectStyles } from '@/ui/default/index';

import type { CSSObject } from '@emotion/react';

interface SelectStyleState {
  isSelected?: boolean;
}

const languageSelectStyles: Record<string, unknown> = {
  ...reactSelectStyles,
  container: (provided: CSSObject): CSSObject => ({
    ...reactSelectStyles.container(provided),
    'margin-top': '2px',
  }),
  control: (provided: CSSObject): CSSObject => ({
    ...reactSelectStyles.control(provided),
    border: borders.textField,
    padding: 0,
    fontSize: '13px',
    minHeight: 'auto',
  }),
  dropdownIndicator: (provided: CSSObject): CSSObject => ({
    ...reactSelectStyles.dropdownIndicator(provided),
    padding: '4px',
  }),
  option: (provided: CSSObject, state: SelectStyleState): CSSObject => ({
    ...reactSelectStyles.option(provided, state),
    padding: 0,
    paddingLeft: '8px',
  }),
  menu: (provided: CSSObject): CSSObject => ({
    ...reactSelectStyles.menu(provided),
    margin: '2px 0',
  }),
  menuList: (provided: CSSObject): CSSObject => ({
    ...provided,
    'max-height': '200px',
  }),
};

export default languageSelectStyles;
