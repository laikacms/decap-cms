import { describe, expect, it } from 'vitest';

import { colors } from '@/ui/default/styles';

/**
 * Regression test for DCMS-1436: `colors.text`, `colors.inactive`, and
 * `colors.buttonDisabledText` all aliased to `colorsRawDefaults.gray`
 * (`#798291`), which only reaches 3.87:1 contrast on `#fff` and 3.40:1 on
 * `#eff0f4` — both below the WCAG 2.1 AA 1.4.3 body-text minimum of 4.5:1.
 * axe-core flagged 21 nodes across `#/collections/posts`, `#/media`, and
 * `#/workflow` built on these tokens.
 *
 * The three tokens now resolve to `colorsRawDefaults.grayDark` (`#313d3e`),
 * which clears 4.5:1 against both the light `background` (`#eff0f4`) and
 * `foreground` (`#fff`) tokens used as backdrops throughout the CMS chrome.
 *
 * WCAG relative-luminance / contrast-ratio math per
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance and
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio.
 */

const AA_MIN_CONTRAST = 4.5;

// `colors.*` values are wired through the `var(--decap-color-*, <hex>)`
// CSS-custom-property fallback layer (DCMS-670 / DCMS-421), so the resolved
// default hex must be pulled out of the `var()` wrapper before doing luminance
// math on it.
function resolveHex(value: string): string {
  const match = value.match(/var\([^,]+,\s*([^)]+)\)/);
  return (match ? match[1] : value).trim();
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = resolveHex(hex).replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map(c => c + c)
          .join('')
      : normalized;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return [r, g, b];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(channel => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('ui-default color-contrast (DCMS-1436)', () => {
  const backdrops: Array<[string, string]> = [
    ['background', colors.background],
    ['foreground', colors.foreground],
  ];
  const textTokens: Array<[string, string]> = [
    ['text', colors.text],
    ['inactive', colors.inactive],
    ['buttonDisabledText', colors.buttonDisabledText],
  ];

  it.each(
    textTokens.flatMap(([tokenName, tokenValue]) =>
      backdrops.map(([bgName, bgValue]) => [tokenName, tokenValue, bgName, bgValue] as const),
    ),
  )('colors.%s (%s) reaches AA contrast (>= 4.5:1) against colors.%s (%s)',
    (_tokenName, tokenValue, _bgName, bgValue) => {
      const ratio = contrastRatio(tokenValue, bgValue);

      expect(ratio).toBeGreaterThanOrEqual(AA_MIN_CONTRAST);
    },
  );

  it('no longer resolves colors.text/inactive/buttonDisabledText to the sub-AA raw gray', () => {
    const subAaGray = '#798291';

    expect(resolveHex(colors.text).toLowerCase()).not.toBe(subAaGray);
    expect(resolveHex(colors.inactive).toLowerCase()).not.toBe(subAaGray);
    expect(resolveHex(colors.buttonDisabledText).toLowerCase()).not.toBe(subAaGray);
  });
});
