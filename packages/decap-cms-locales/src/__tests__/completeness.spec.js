import en from '../en';
import * as localesModule from '../index';

// Spread into a plain object so locale keys can be accessed dynamically
// below; eslint's import/namespace rule can't statically validate computed
// member access directly on a namespace import.
const locales = { ...localesModule };

/**
 * Recursively collects the leaf-key paths of a locale object, e.g.
 * `{ auth: { login: 'Login' } }` -> ['auth.login'].
 */
function collectLeafPaths(obj, prefix = '') {
  const paths = [];
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...collectLeafPaths(value, nextPath));
    } else {
      paths.push(nextPath);
    }
  });
  return paths;
}

function diffAgainstEn(enPaths, localePaths) {
  const localePathSet = new Set(localePaths);
  const enPathSet = new Set(enPaths);
  const missing = enPaths.filter(path => !localePathSet.has(path));
  const extra = localePaths.filter(path => !enPathSet.has(path));
  return { missing, extra };
}

// `ua` is a deliberate alias of `uk` (DCMS-534) and is intentionally excluded
// here: it is covered by ua-uk.spec.js and always mirrors `uk`'s drift.
const ALIASES = ['ua'];

// Baseline of already-known drift, captured from the current source so this
// test acts as a regression guard: it fails if drift *increases* beyond
// these numbers, without requiring an immediate translation fix. When a
// locale is improved, its baseline counts here must be lowered accordingly.
// Regenerate by running this spec's "logs the current per-locale drift"
// test and reading the console output.
const BASELINE_DRIFT = {
  bg: { missing: 30, extra: 4 },
  ca: { missing: 30, extra: 0 },
  cs: { missing: 14, extra: 0 },
  da: { missing: 17, extra: 0 },
  de: { missing: 20, extra: 0 },
  es: { missing: 64, extra: 0 },
  fa: { missing: 15, extra: 0 },
  fr: { missing: 24, extra: 0 },
  gr: { missing: 81, extra: 0 },
  he: { missing: 22, extra: 0 },
  hr: { missing: 3, extra: 0 },
  hu: { missing: 90, extra: 0 },
  it: { missing: 15, extra: 0 },
  ja: { missing: 24, extra: 0 },
  ko: { missing: 16, extra: 0 },
  lt: { missing: 40, extra: 0 },
  mk: { missing: 14, extra: 0 },
  nb_no: { missing: 64, extra: 0 },
  nl: { missing: 27, extra: 0 },
  nn_no: { missing: 64, extra: 0 },
  pl: { missing: 22, extra: 0 },
  pt: { missing: 22, extra: 0 },
  ro: { missing: 28, extra: 2 },
  ru: { missing: 14, extra: 0 },
  sl: { missing: 15, extra: 0 },
  sr_Cyrl: { missing: 3, extra: 0 },
  sv: { missing: 26, extra: 0 },
  th: { missing: 14, extra: 0 },
  tr: { missing: 20, extra: 0 },
  uk: { missing: 21, extra: 0 },
  vi: { missing: 55, extra: 0 },
  zh_Hans: { missing: 25, extra: 2 },
  zh_Hant: { missing: 41, extra: 0 },
};

const enPaths = collectLeafPaths(en);
const localeKeys = Object.keys(locales)
  .filter(key => key !== 'en')
  .filter(key => !ALIASES.includes(key));

describe('locale key completeness vs en baseline (DCMS-1599)', () => {
  it('exports a baseline entry for every non-en, non-alias locale', () => {
    expect(localeKeys.slice().sort()).toEqual(Object.keys(BASELINE_DRIFT).slice().sort());
  });

  localeKeys.forEach(localeKey => {
    describe(localeKey, () => {
      const { missing, extra } = diffAgainstEn(enPaths, collectLeafPaths(locales[localeKey]));
      const baseline = BASELINE_DRIFT[localeKey];

      it('does not have more missing keys than the recorded baseline', () => {
        if (!baseline) {
          throw new Error(
            `No BASELINE_DRIFT entry for locale "${localeKey}". Add one to completeness.spec.js.`,
          );
        }
        expect(missing.length).toBeLessThanOrEqual(baseline.missing);
      });

      it('does not have more extra (unknown-in-en) keys than the recorded baseline', () => {
        expect(extra.length).toBeLessThanOrEqual(baseline.extra);
      });
    });
  });

  it('logs the current per-locale drift for regenerating the baseline', () => {
    const report = localeKeys.reduce((acc, localeKey) => {
      const { missing, extra } = diffAgainstEn(enPaths, collectLeafPaths(locales[localeKey]));
      acc[localeKey] = { missing: missing.length, extra: extra.length };
      return acc;
    }, {});
    // eslint-disable-next-line no-console
    console.log('locale key drift vs en:', JSON.stringify(report, null, 2));
    expect(report).toBeDefined();
  });
});
