import { describe, expect, it } from 'vitest';

import { colors } from '../../../../../ui/default/index';
import { styleStrings } from '../EditorControl';

/**
 * Regression test for DCMS-421: the widget input value text color was
 * hardcoded to `#444a57` in `styleStrings.widget` instead of resolving
 * through the themeable `colors` token layer. Every other token in the
 * same style block (`colors.inputBackground`, `borders.textField`, etc.)
 * already followed the theme, so on the laika-app dark theme the typed
 * value rendered at ~1.66:1 contrast against the dark input background —
 * a WCAG AA (4.5:1) failure.
 *
 * `colors.textLead` is used (rather than `colors.text`) because it is the
 * only token of the two that clears 4.5:1 against `colors.inputBackground`
 * on both the default light theme (white input, ~11.2:1) and the
 * laika-app dark theme override (~15:1), while `colors.text` only reaches
 * ~3.9:1 on light and fails AA there.
 */
describe('EditorControl styleStrings — widget text theming (DCMS-421)', () => {
  it('widget input color resolves through the themeable textLead token', () => {
    expect(styleStrings.widget).toContain(colors.textLead);
  });

  it('widget input color is not hardcoded to the old non-theme-aware value', () => {
    expect(styleStrings.widget).not.toMatch(/color:\s*#444a57/i);
  });

  it('widget input background still uses the themeable inputBackground token', () => {
    expect(styleStrings.widget).toContain(colors.inputBackground);
  });
});
