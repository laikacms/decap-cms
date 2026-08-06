import { merge } from 'lodash-es';

import { oneLine } from '@/lib/util/index';
import { getLocale } from './registry';

export function getPhrases(locale: string) {
  const fallback = getLocale('en');
  const requested = getLocale(locale);
  if (!fallback && !requested) {
    console.warn(oneLine`
      No locale loaded ("${locale}" was requested and the "en" fallback is not registered either).
      The UI will render raw translation keys. Register a locale with
      CMS.registerLocale('en', en) using phrases from the locales export.
    `);
  }
  const phrases = merge({}, fallback, requested);
  return phrases;
}
