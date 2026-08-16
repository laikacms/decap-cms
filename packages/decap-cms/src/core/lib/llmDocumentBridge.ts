import { changeDraftField } from '@/core/actions/entries';
import { getI18nInfo } from '@/core/lib/i18n';
import { applyJsonPatch } from '@/core/lib/jsonPatch';
import { selectFields } from '@/core/reducers/collections';

import type { I18nInfo } from '@/core/lib/i18n';
import type { AppDispatch, RootState } from '@/core/redux';
import type {
  CmsCollectionState,
  CmsEntry,
  CmsEntryField,
  LlmDocumentBridge,
  LlmPatchOperation,
} from '@/lib/util/index';

/**
 * Builds the `LlmDocumentBridge` handed to an `LlmTransport`.
 *
 * This is the whole of a transport's access to CMS state, and the reason the
 * CMS can host AI UI without hosting AI: the model asks to read or patch the
 * open entry, the transport forwards that here, and this module is the only
 * thing that knows about the store. A transport gets no dispatch, no selectors
 * and no entry internals.
 *
 * Writes go through the published `changeDraftField` action, so an AI edit is
 * indistinguishable from a keystroke: the same reducer path, the same
 * `hasChanged` diffing, the same `entryDraftChange` notification event fired
 * to any other extension listening.
 */

/** Data for the locale being edited; the default locale lives at the entry root. */
function readLocaleData(
  entry: CmsEntry | undefined,
  locale: string | undefined,
  defaultLocale: string | undefined,
): Record<string, unknown> {
  const rootData = (entry?.data as Record<string, unknown>) ?? {};
  if (!locale || !defaultLocale || locale === defaultLocale) {
    return rootData;
  }

  const localized = (entry?.i18n as Record<string, { data?: Record<string, unknown> }> | undefined)
    ?.[locale];
  // An untranslated locale has no data yet; the default locale's values are
  // what the editor shows, so they are what the model should see.
  return localized?.data ?? rootData;
}

/**
 * The entry as the draft reducer knows it, in both the workflow and published
 * caches. `changeDraftField` diffs the draft against these to decide whether
 * the entry is dirty, so passing them is what keeps the save button honest
 * after an AI edit (mirrors `useEditor`'s `handleChangeDraftField`).
 */
function selectOriginalEntries(state: RootState, collectionName: string, slug: string): CmsEntry[] {
  const key = `${collectionName}.${slug}`;
  return [
    state.editorialWorkflow?.entities?.[key],
    state.entries?.entities?.[key],
  ].filter((entry): entry is CmsEntry => Boolean(entry));
}

export interface CreateLlmDocumentBridgeOptions {
  collection: CmsCollectionState;
  /**
   * Reads the *live* draft. A getter rather than a value: a session outlives
   * any single render, and a transport that captured a stale entry would
   * patch yesterday's data.
   */
  getEntry: () => CmsEntry | undefined;
  /** Locale being edited; omit for collections without i18n. */
  locale?: string | undefined;
  dispatch: AppDispatch;
  getState: () => RootState;
}

export function createLlmDocumentBridge({
  collection,
  getEntry,
  locale,
  dispatch,
  getState,
}: CreateLlmDocumentBridgeOptions): LlmDocumentBridge {
  const i18nInfo = getI18nInfo(collection) as I18nInfo | undefined;
  const defaultLocale = i18nInfo?.defaultLocale;

  function currentSlug() {
    return getEntry()?.slug ?? '';
  }

  function currentFields(): CmsEntryField[] {
    return (selectFields(collection, currentSlug()) ?? []) as CmsEntryField[];
  }

  return {
    get context() {
      return {
        collection: collection.name,
        slug: currentSlug(),
        ...(locale ? { locale } : {}),
      };
    },

    read() {
      return readLocaleData(getEntry(), locale, defaultLocale);
    },

    fields() {
      return currentFields();
    },

    applyPatch(operations: LlmPatchOperation[]) {
      const entry = getEntry();
      const current = readLocaleData(entry, locale, defaultLocale);

      // Throws `JsonPatchError` on a malformed or inapplicable operation,
      // leaving the draft untouched; the transport reports that to the model.
      const patched = applyJsonPatch(current, operations);

      const fields = currentFields();
      const entries = selectOriginalEntries(getState(), collection.name, currentSlug());
      const i18n = i18nInfo && locale
        ? { currentLocale: locale, defaultLocale: i18nInfo.defaultLocale, locales: i18nInfo.locales }
        : undefined;

      const changed: string[] = [];
      for (const name of Object.keys(patched)) {
        // Only fields an operation actually addressed: patching one key must
        // not re-dispatch every other field and mark the whole entry dirty.
        if (!operations.some(operation => operation.path.startsWith(`/${name}`))) {
          continue;
        }
        const field = fields.find(candidate => candidate?.name === name);
        if (!field) {
          // A model can invent a field name. Skipping is the honest outcome:
          // the transport reports what landed and the editor stays intact.
          console.warn(`Field "${name}" is not in the collection schema; skipping AI update.`);
          continue;
        }
        dispatch(changeDraftField({
          field,
          value: patched[name],
          metadata: {},
          entries,
          i18n,
        }));
        changed.push(name);
      }

      return { changed };
    },
  };
}
