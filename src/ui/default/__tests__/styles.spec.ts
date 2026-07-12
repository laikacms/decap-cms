import { describe, expect, it } from 'vitest';

import { colors, components, reactSelectStyles } from '../styles';

/**
 * Regression test for DCMS-290: the workflow/collection header card
 * ("cardTop") is built on the shared `card` base style, which used to
 * hardcode `background-color: #fff`. In dark theme that left the card
 * white while `cardTopHeading` had no explicit `color` and inherited the
 * light-gray dark-theme text color, producing ~1.3:1 contrast.
 *
 * Both `card`'s background and `cardTopHeading`'s color must resolve
 * through the themeable `colors` token layer (CSS custom properties) so
 * they follow the active theme instead of being hardcoded.
 */
describe('ui-default styles - card theming (DCMS-290)', () => {
  it('card background uses the themeable foreground token, not a hardcoded white', () => {
    const css = components.cardTop.styles;

    expect(css).toContain(colors.foreground);
    expect(css).not.toMatch(/background-color:\s*#fff/i);
  });

  it('cardTopHeading has an explicit, themeable text color', () => {
    const css = components.cardTopHeading.styles;

    expect(css).toContain(colors.textLead);
  });
});

/**
 * Regression test for DCMS-299: the Select/Relation widget's react-select
 * `control` and `menu` never set a `backgroundColor`, so react-select's
 * default white background stayed put in dark theme, and `option` set
 * background per-state but never `color`, producing dark-text-on-dark-
 * background for focused/selected rows.
 *
 * `control`, `menu`, `menuList`, `singleValue`, `input` and `option` must
 * all resolve backgroundColor/color through the themeable `colors` token
 * layer so the widget follows the active theme.
 */
describe('ui-default styles - react-select theming (DCMS-299)', () => {
  it('control uses the themeable input background and text color', () => {
    const styles = reactSelectStyles.control({});

    expect(styles.backgroundColor).toBe(colors.inputBackground);
    expect(styles.color).toBe(colors.text);
  });

  it('menu and menuList use the themeable input background', () => {
    expect(reactSelectStyles.menu({}).backgroundColor).toBe(colors.inputBackground);
    expect(reactSelectStyles.menuList({}).backgroundColor).toBe(colors.inputBackground);
  });

  it('singleValue and input use the themeable text color', () => {
    expect(reactSelectStyles.singleValue({}).color).toBe(colors.text);
    expect(reactSelectStyles.input({}).color).toBe(colors.text);
  });

  it('option sets a themeable text color for every state', () => {
    expect(reactSelectStyles.option({}, { isSelected: true }).color).toBe(colors.textLight);
    expect(reactSelectStyles.option({}, { isFocused: true }).color).toBe(colors.text);
    expect(reactSelectStyles.option({}, {}).color).toBe(colors.text);
  });
});
