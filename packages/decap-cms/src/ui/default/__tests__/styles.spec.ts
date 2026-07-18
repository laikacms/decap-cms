import { describe, expect, it } from 'vitest';

import { colors, components } from '@/ui/default/styles';

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

// DCMS-299 (dark-theme contrast for the Select/Relation widgets) predates the
// Base UI migration and tested the now-removed `reactSelectStyles` per-state
// style functions (#631/DCMS-545). The Select/Relation widgets now render
// through `src/ui/Select.tsx` and `src/ui/Combobox.tsx`, which resolve their
// background/text colors through the same `--popover` / `--popover-foreground`
// / `--input` / `--accent` CSS custom properties as every other primitive in
// `src/ui/`, so the intent of this regression test is covered structurally
// rather than per-widget. See `src/ui/__tests__/ui-primitives.spec.tsx` for
// primitive-level behavior coverage.
