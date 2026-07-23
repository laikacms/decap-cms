import { describe, expect, it } from 'vitest';

import { flattenPhrases } from '@/core/i18n/polyglot';
import * as locales from '@/locales';

/**
 * Keys that every locale pack must ship. A locale silently falling back to
 * `en` for one of these leaks untranslated English into the UI without any
 * `Missing translation for key` warning (see DCMS-1518) — track new
 * safety-critical keys here as they're added.
 */
const CRITICAL_KEYS = ['editor.editorControl.field.required'];

describe('locale packs', () => {
  const { en, ...otherLocales } = locales;
  const enKeys = new Set(Object.keys(flattenPhrases(en)));

  for (const key of CRITICAL_KEYS) {
    it(`en ships critical key "${key}"`, () => {
      expect(enKeys.has(key)).toBe(true);
    });
  }

  for (const [localeName, phrases] of Object.entries(otherLocales)) {
    describe(localeName, () => {
      const localeKeys = new Set(Object.keys(flattenPhrases(phrases)));

      for (const key of CRITICAL_KEYS) {
        it(`has "${key}"`, () => {
          expect(localeKeys.has(key)).toBe(true);
        });
      }
    });
  }
});
