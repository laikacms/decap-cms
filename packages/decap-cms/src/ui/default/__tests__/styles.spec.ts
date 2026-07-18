import { describe, expect, it } from 'vitest';

import { colors, components, themeToCssVars } from '@/ui/default/styles';

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
 * Pinning test for `themeToCssVars` (DCMS-1133): the CSS-variable naming
 * convention (`--decap-{prefix}-{key}`), the empty/undefined-group
 * behavior, and the silent-drop-non-string-values behavior were previously
 * unpinned by any test.
 */
describe('themeToCssVars', () => {
  it('returns an empty object for an empty theme', () => {
    expect(themeToCssVars({})).toEqual({});
  });

  it('emits only the vars for a partial `colors` group, using the `--decap-color-*` prefix', () => {
    expect(themeToCssVars({ colors: { active: '#e91e63', text: '#111111' } })).toEqual({
      '--decap-color-active': '#e91e63',
      '--decap-color-text': '#111111',
    });
  });

  it('emits `colorsRaw` under the `--decap-color-raw-*` prefix', () => {
    expect(themeToCssVars({ colorsRaw: { blue: '#3a69c7' } })).toEqual({
      '--decap-color-raw-blue': '#3a69c7',
    });
  });

  it('merges `colors` and `colorsRaw` into a single vars object', () => {
    expect(
      themeToCssVars({
        colors: { active: '#e91e63' },
        colorsRaw: { blue: '#3a69c7' },
      }),
    ).toEqual({
      '--decap-color-active': '#e91e63',
      '--decap-color-raw-blue': '#3a69c7',
    });
  });

  it('silently drops non-string values instead of emitting them', () => {
    const theme = {
      colors: {
        active: '#e91e63',
        // @ts-expect-error — exercising runtime behavior for non-string input
        buttonHover: 42,
      },
    };

    expect(themeToCssVars(theme)).toEqual({ '--decap-color-active': '#e91e63' });
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
