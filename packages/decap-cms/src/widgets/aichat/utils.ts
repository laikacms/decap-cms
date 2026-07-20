import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@/lib/util/index';

// Mirrors `changeDraftField` in `@/core/actions/entries`. Widgets sit below
// core in the layer order (local/layer-deps), so the action is rebuilt here
// instead of imported; the type string is the reducer's contract.
export const DRAFT_CHANGE_FIELD = 'DRAFT_CHANGE_FIELD';

export interface DraftI18nContext {
  currentLocale: string;
  defaultLocale: string;
  locales: string[];
}

export function changeDraftField({
  field,
  value,
  metadata,
  entries,
  i18n,
}: {
  field: CmsEntryField,
  value: unknown,
  metadata: Record<string, unknown>,
  entries: CmsEntry[],
  i18n?: DraftI18nContext | undefined,
}) {
  return {
    type: DRAFT_CHANGE_FIELD,
    payload: { field, value, metadata, entries, i18n },
  };
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
