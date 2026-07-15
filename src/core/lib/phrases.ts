import { merge } from 'lodash-es';

import { getLocale } from './registry';

export function getPhrases(locale: string) {
  const phrases = merge({}, getLocale('en'), getLocale(locale));
  return phrases;
}
