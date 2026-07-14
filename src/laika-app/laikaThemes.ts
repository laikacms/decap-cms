import type { DecapTheme } from '@/core/index';

/**
 * Laika-flavored themes, expressed as `DecapTheme` overrides. Pass either to
 * `DecapCmsProvider` (directly or via `LaikaThemeProvider`) — every component
 * that reads from `colors`/`colorsRaw` will be re-skinned via the
 * `--decap-color-*` CSS variables. Tokens omitted here keep their default.
 */

export const laikaLightTheme: DecapTheme = {
  colors: {
    active: '#3a69c7',
    activeBackground: '#e8f5fe',
  },
};

export const laikaDarkTheme: DecapTheme = {
  colorsRaw: {
    grayLight: '#1c1f26',
    gray: '#9aa3b2',
    grayDark: '#e5e7eb',
    white: '#11141a',
    blueLight: '#1d2a4a',
  },
  colors: {
    text: '#c8ced8',
    textLight: '#11141a',
    textLead: '#f3f4f6',
    background: '#11141a',
    foreground: '#1c1f26',
    active: '#6ea1ff',
    activeBackground: '#1d2a4a',
    inactive: '#5a6478',
    button: '#3a69c7',
    buttonText: '#ffffff',
    inputBackground: '#1c1f26',
    infoText: '#6ea1ff',
    infoBackground: '#1d2a4a',
    textFieldBorder: '#2a2f3a',
    controlLabel: '#9aa3b2',
    checkerboardLight: '#1c1f26',
    checkerboardDark: '#11141a',

    // Status colors — without these the badges + alerts keep their light
    // pastel backgrounds and look washed-out on the dark surface. These
    // are darker, more saturated variants of the same hues.
    successText: '#9bdc7c',
    successBackground: '#1f3a1f',
    warnText: '#f0c674',
    warnBackground: '#3a2f10',
    errorText: '#ff8a8a',
    errorBackground: '#3a1c1c',
    statusDraftText: '#cda1ff',
    statusDraftBackground: '#2a1f3a',
    statusReviewText: '#f0c674',
    statusReviewBackground: '#3a2f10',
    statusReadyText: '#9bdc7c',
    statusReadyBackground: '#1f3a1f',
    mediaDraftText: '#cda1ff',
    mediaDraftBackground: '#2a1f3a',
  },
};

export type LaikaThemeMode = 'light' | 'dark' | 'system';

/**
 * Resolve a `LaikaThemeMode` to the concrete `DecapTheme` that should be passed
 * to `DecapCmsProvider`. `'system'` consults `prefers-color-scheme`; on the
 * server (or where `matchMedia` is unavailable) it falls back to light.
 */
export function resolveTheme(mode: LaikaThemeMode): DecapTheme {
  if (mode === 'dark') {
    return laikaDarkTheme;
  }
  if (mode === 'light') {
    return laikaLightTheme;
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return laikaDarkTheme;
  }
  return laikaLightTheme;
}
