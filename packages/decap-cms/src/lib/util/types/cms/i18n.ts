import type { ReactNode } from 'react';
import type { CmsCollectionState } from './collections.js';
import type { CmsEntry, CmsEntryField } from './entries.js';

export interface CmsI18nConfig {
  structure: 'multiple_folders' | 'multiple_files' | 'single_file';
  locales: string[];
  default_locale?: string;
}

/** A field that may be translated between two locales, with its source value. */
export interface CmsTranslatableField {
  name: string;
  field: CmsEntryField;
  /** The field's value in the source locale. `undefined` when unset. */
  value: unknown;
}

/**
 * Everything a locale action needs, pre-resolved by the editor so the action
 * stays free of Redux and of the CMS's internal i18n helpers.
 */
export interface CmsLocaleActionRenderProps {
  collection: CmsCollectionState;
  entry: CmsEntry;
  /** The locale content is read from: the collection's default locale. */
  sourceLocale: string;
  /** The locale currently being edited, i.e. where values are written. */
  targetLocale: string;
  locales: string[];
  /**
   * Fields translatable from `sourceLocale` to `targetLocale`, with their
   * source values already read. Fields with an empty/unset source value are
   * omitted. Defaults to the action's own source/target locales.
   */
  getTranslatableFields: (sourceLocale?: string, targetLocale?: string) => CmsTranslatableField[];
  /**
   * Write a value into `targetLocale`, through the same draft-change path the
   * built-in "copy from locale" action uses.
   */
  applyValue: (fieldName: string, value: unknown) => void;
  /** Translate function bound to the active locale. */
  t: (key: string, options?: Record<string, string>) => string;
}

/**
 * An action rendered in the editor's locale row, next to the built-in locale
 * dropdowns. Registered with `CMS.registerLocaleAction`.
 *
 * This is the seam that keeps feature-specific editor actions (AI translation,
 * glossary lookup, translation-memory prefill) out of the CMS itself: the CMS
 * resolves the i18n context and hands it over, the action owns its own UI,
 * dependencies and phrases.
 */
export interface CmsLocaleAction {
  /** Unique; registering the same name twice throws. */
  name: string;
  /**
   * Decides whether the action renders for the current locale pair. Omit to
   * render whenever the entry has i18n and a locale row is shown. Actions that
   * only make sense when editing a non-default locale should compare
   * `sourceLocale` with `targetLocale`.
   */
  isAvailable?: (
    props: Pick<CmsLocaleActionRenderProps, 'sourceLocale' | 'targetLocale' | 'locales' | 'collection'>,
  ) => boolean;
  render: (props: CmsLocaleActionRenderProps) => ReactNode;
}
