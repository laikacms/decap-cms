/**
 * Minimal in-house replacement for `node-polyglot`, preserving the phrase
 * format used by every locale pack in `src/locales/*`: `%{token}`
 * interpolation and `||||`-delimited plural forms selected by `smart_count`.
 *
 * The plural-rule tables are ported from node-polyglot (c) 2012-2018 Airbnb,
 * Inc., BSD-2-Clause — including its lookup semantics (exact locale match,
 * then the part before the first `-`, then English) so existing locale packs
 * keep selecting the same plural forms.
 */

import type { CmsLocalePhrases } from '@/lib/util/types/cms/common';

export type TranslateOptions = Record<string, unknown> & {
  smart_count?: number,
  _?: string,
};

// Same call signature react-polyglot's `t` was declared with, so existing
// consumers (including third-party widgets receiving `t` as a prop) are
// unaffected.
export type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

const PLURAL_DELIMITER = '||||';
const TOKEN_REGEX = /%\{(.*?)\}/g;

function russianPluralGroups(n: number): number {
  const lastTwo = n % 100;
  const end = lastTwo % 10;
  if (lastTwo !== 11 && end === 1) {
    return 0;
  }
  if (2 <= end && end <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return 1;
  }
  return 2;
}

const pluralTypes: Record<string, (n: number) => number> = {
  arabic(n) {
    // http://www.arabeyes.org/Plural_Forms
    if (n < 3) {
      return n;
    }
    const lastTwo = n % 100;
    if (lastTwo >= 3 && lastTwo <= 10) {
      return 3;
    }
    return lastTwo >= 11 ? 4 : 5;
  },
  bosnian_serbian: russianPluralGroups,
  chinese: () => 0,
  croatian: russianPluralGroups,
  french: n => (n >= 2 ? 1 : 0),
  german: n => (n !== 1 ? 1 : 0),
  russian: russianPluralGroups,
  lithuanian(n) {
    if (n % 10 === 1 && n % 100 !== 11) {
      return 0;
    }
    return n % 10 >= 2 && n % 10 <= 9 && (n % 100 < 11 || n % 100 > 19) ? 1 : 2;
  },
  czech(n) {
    if (n === 1) {
      return 0;
    }
    return n >= 2 && n <= 4 ? 1 : 2;
  },
  polish(n) {
    if (n === 1) {
      return 0;
    }
    const end = n % 10;
    return 2 <= end && end <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
  },
  icelandic: n => (n % 10 !== 1 || n % 100 === 11 ? 1 : 0),
  slovenian(n) {
    const lastTwo = n % 100;
    if (lastTwo === 1) {
      return 0;
    }
    if (lastTwo === 2) {
      return 1;
    }
    if (lastTwo === 3 || lastTwo === 4) {
      return 2;
    }
    return 3;
  },
  romanian(n) {
    if (n === 1) {
      return 0;
    }
    const lastTwo = n % 100;
    if (n === 0 || (lastTwo >= 2 && lastTwo <= 19)) {
      return 1;
    }
    return 2;
  },
  ukrainian: russianPluralGroups,
};

const pluralTypeToLanguages: Record<string, string[]> = {
  arabic: ['ar'],
  bosnian_serbian: ['bs-Latn-BA', 'bs-Cyrl-BA', 'srl-RS', 'sr-RS'],
  chinese: ['id', 'id-ID', 'ja', 'ko', 'ko-KR', 'lo', 'ms', 'th', 'th-TH', 'zh'],
  croatian: ['hr', 'hr-HR'],
  german: [
    'fa',
    'da',
    'de',
    'en',
    'es',
    'fi',
    'el',
    'he',
    'hi-IN',
    'hu',
    'hu-HU',
    'it',
    'nl',
    'no',
    'pt',
    'sv',
    'tr',
  ],
  french: ['fr', 'tl', 'pt-br'],
  russian: ['ru', 'ru-RU'],
  lithuanian: ['lt'],
  czech: ['cs', 'cs-CZ', 'sk'],
  polish: ['pl'],
  icelandic: ['is', 'mk'],
  slovenian: ['sl-SL'],
  romanian: ['ro'],
  ukrainian: ['uk', 'ua'],
};

const languageToPluralType: Record<string, string> = {};
for (const [type, languages] of Object.entries(pluralTypeToLanguages)) {
  for (const language of languages) {
    languageToPluralType[language] = type;
  }
}

function pluralTypeName(locale: string): string {
  return (
    languageToPluralType[locale]
      ?? languageToPluralType[locale.split('-', 1)[0]]
      ?? languageToPluralType.en
  );
}

/**
 * Selects the plural form of a `||||`-delimited phrase and interpolates
 * `%{token}` placeholders. Tokens with no matching (non-null) substitution are
 * left in place verbatim, matching node-polyglot.
 */
export function transformPhrase(
  phrase: string,
  substitutions?: TranslateOptions | number,
  locale = 'en',
): string {
  if (substitutions == null) {
    return phrase;
  }

  const options: TranslateOptions = typeof substitutions === 'number' ? { smart_count: substitutions } : substitutions;

  let result = phrase;
  if (options.smart_count != null && phrase) {
    const texts = phrase.split(PLURAL_DELIMITER);
    const index = pluralTypes[pluralTypeName(locale)](options.smart_count);
    result = (texts[index] ?? texts[0]).replace(/^[^\S]*|[^\S]*$/g, '');
  }

  return result.replace(TOKEN_REGEX, (expression, token: string) => {
    const value = options[token];
    return value == null ? expression : String(value);
  });
}

/** Flattens nested locale packs into dot-separated keys. */
export function flattenPhrases(
  phrases: CmsLocalePhrases,
  prefix = '',
  flattened: Record<string, string> = {},
): Record<string, string> {
  for (const [key, phrase] of Object.entries(phrases ?? {})) {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    if (typeof phrase === 'object') {
      flattenPhrases(phrase, prefixedKey, flattened);
    } else {
      flattened[prefixedKey] = phrase;
    }
  }
  return flattened;
}

/**
 * Builds a `t(key, options)` function over a locale's phrases. Missing keys
 * fall back to the `_` option when provided, otherwise warn and return the
 * key itself.
 */
export function createTranslator(locale: string, phrases: CmsLocalePhrases): TranslateFunction {
  const flattened = flattenPhrases(phrases);

  return function t(key, options) {
    const opts = (typeof options === 'number'
      ? { smart_count: options }
      : (options ?? {})) as TranslateOptions;
    const phrase = flattened[key] ?? opts._;
    if (typeof phrase !== 'string') {
      console.warn(`Missing translation for key: "${key}"`);
      return key;
    }
    return transformPhrase(phrase, opts, locale);
  };
}
