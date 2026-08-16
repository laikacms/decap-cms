import { describe, expect, it } from 'vitest';

import en from '../i18n/en';
import translatePhrases from '../i18n/index';

/**
 * Ported from the CMS package's `locales-parity.spec.ts` when these phrases
 * moved out (DCMS-1395). Same rule: a locale missing one of these silently
 * falls back to English in the editor chrome with no missing-key warning
 * (DCMS-1518), so the gap has to fail a test instead.
 */
const REQUIRED_KEYS = [
  'translateFromDefault',
  'translatingFromDefault',
  'translateFromDefaultConfirm',
  'translateFromDefaultConfirmTitle',
];

/**
 * Known gap, inherited from the CMS package: only `en` ever had a translation
 * for the failure message, so every other locale shows it in English. Listed
 * here so it stays visible rather than quietly passing.
 */
const EN_ONLY_KEYS = ['translateFailed'];

function keysFor(phrases: unknown): string[] {
  const i18n = (phrases as any)?.editor?.editorControlPane?.i18n ?? {};
  return Object.keys(i18n);
}

describe('ai-translate locale packs', () => {
  const locales = Object.entries(translatePhrases);

  it('ships phrases for every locale the CMS itself ships', () => {
    // 36 locale packs came across in the move; a locale silently dropped here
    // would fall back to English without any other test noticing.
    expect(locales.length).toBe(36);
    expect(translatePhrases['en']).toBeDefined();
  });

  it('en ships every key, including the failure message', () => {
    expect(keysFor(en)).toEqual(expect.arrayContaining([...REQUIRED_KEYS, ...EN_ONLY_KEYS]));
  });

  for (const [code, phrases] of Object.entries(translatePhrases)) {
    it(`${code} ships every required key`, () => {
      expect(keysFor(phrases)).toEqual(expect.arrayContaining(REQUIRED_KEYS));
    });
  }

  it('nests phrases at the key path the editor reads', () => {
    expect((en as any).editor.editorControlPane.i18n.translateFromDefault).toContain('%{locale}');
  });
});
