/**
 * In-house replacement for `react-polyglot`: an `I18n` provider plus the
 * `useTranslate` hook and `translate` HOC the rest of the app consumes. The
 * phrase semantics live in `./polyglot`.
 */
import React, { useContext, useMemo } from 'react';

import { createTranslator } from './polyglot';

import type { CmsLocalePhrases } from '@/lib/util/types/cms/common';
import type { ComponentType, ReactNode } from 'react';
import type { TranslateFunction } from './polyglot';

export { createTranslator, flattenPhrases, transformPhrase } from './polyglot';
export type { TranslateFunction, TranslateOptions } from './polyglot';

const I18nContext = React.createContext<TranslateFunction | null>(null);

export interface I18nProps {
  locale: string;
  messages: CmsLocalePhrases;
  children?: ReactNode;
}

/** Provides the `t` function derived from the active locale's phrases. */
export function I18n({ locale, messages, children }: I18nProps) {
  const translateFn = useMemo(() => createTranslator(locale, messages), [locale, messages]);
  return <I18nContext.Provider value={translateFn}>{children}</I18nContext.Provider>;
}

/** Returns the ambient `t` function. Must be rendered inside an `I18n`. */
export function useTranslate(): TranslateFunction {
  const t = useContext(I18nContext);
  if (!t) {
    throw new Error('useTranslate must be used within an <I18n> provider');
  }
  return t;
}

/** HOC injecting the ambient `t` function as a `t` prop. */
export function translate() {
  return function wrap<P extends { t: TranslateFunction }>(
    WrappedComponent: ComponentType<P>,
  ): ComponentType<Omit<P, 't'>> {
    // TS defers LibraryManagedAttributes while P is generic, so JSX rejects
    // the spread; erase the generic once here instead.
    const Component = WrappedComponent as ComponentType<{ t: TranslateFunction }>;
    function Translated(props: Omit<P, 't'>) {
      const t = useTranslate();
      return <Component {...props} t={t} />;
    }
    Translated.displayName = `Translate(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
    return Translated;
  };
}
