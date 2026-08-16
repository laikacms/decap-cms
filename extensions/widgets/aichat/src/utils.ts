import type { CmsCollectionState, CmsEntryField } from '@laikacms/decap-cms/lib/util';

export interface DraftI18nContext {
  currentLocale: string;
  defaultLocale: string;
  locales: string[];
}

export type I18nInfo = {
  locales: string[],
  defaultLocale: string,
  structure: string,
};

export function hasI18n(collection: CmsCollectionState): boolean {
  return Boolean(collection?.i18n);
}

export function getI18nInfo(collection: CmsCollectionState): I18nInfo | undefined {
  if (!hasI18n(collection)) {
    return undefined;
  }
  const { structure, locales, default_locale: defaultLocale } = collection.i18n;
  return { structure, locales, defaultLocale };
}

export function selectFields(collection: CmsCollectionState, slug: string): CmsEntryField[] | undefined {
  if (collection.type === 'file_based_collection') {
    const file = collection.files?.find(f => f?.name === slug);
    return file?.fields;
  }
  return collection.fields;
}
