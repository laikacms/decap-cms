/**
 * The editor, reachable from outside React as `CMS.editor`: read the open entry
 * and change its fields the way a person typing would, through the same
 * `changeDraftField` action. Nothing here saves.
 *
 * Experimental: built for the Decap Turbo editor bridge, and may change or go
 * away in any release, minor and patch included.
 */
import { cloneDeep } from 'lodash-es';

import { changeDraftField, clearFieldHighlights, markFieldsExternallyChanged } from '@/core/actions/entries';
import { selectFields } from '@/core/reducers/collections';
import { selectEntry, selectUnpublishedEntry } from '@/core/reducers/selectors';
import { store } from '@/core/redux';
import { getDataPath, getI18nInfo, isFieldTranslatable } from './i18n';

import type {
  CmsCollectionState,
  CmsEditorApi,
  CmsEditorFieldDefinition,
  CmsEditorSnapshot,
  CmsEntry,
  CmsEntryField,
  CmsFieldPatch,
  CmsFieldPatchResult,
} from '@/lib/util/index';

export type EditorSnapshot = CmsEditorSnapshot;
export type FieldPatch = CmsFieldPatch;
export type PatchResult = CmsFieldPatchResult;

/** Widgets whose value is a plain string; a patch giving them anything else is refused rather than rendered broken. */
const STRING_WIDGETS = new Set(['string', 'text', 'markdown', 'richtext', 'color', 'datetime', 'select']);

/** How long a patched field stays highlighted, in ms. */
const HIGHLIGHT_MS = 4000;

type State = any;

interface Context {
  collection: CmsCollectionState;
  collectionName: string;
  entry: CmsEntry;
  fields: CmsEntryField[];
  slug: string;
}

type I18nSettings = { locales?: string[], defaultLocale?: string };

function openEntry(): Context | null {
  const state = store.getState() as State;
  if (!state) return null;
  const entry = state.entryDraft?.entry as (CmsEntry & { partial?: boolean }) | undefined;
  if (!entry || Object.keys(entry).length === 0 || entry.partial === true || !entry.collection) return null;

  const collectionName = entry.collection;
  const collection = state.collections?.[collectionName] as CmsCollectionState | undefined;
  if (!collection) return null;

  const slug = entry.slug;
  const fields = selectFields(collection, slug) as CmsEntryField[] | undefined;
  if (!fields) return null;
  return { collection, collectionName, entry, fields, slug };
}

function plainValue<T>(value: T): T {
  return cloneDeep(value);
}

export function getCurrentEntry(): CmsEditorSnapshot | null {
  const context = openEntry();
  if (!context) return null;
  const { collection, collectionName, entry, fields } = context;
  const { locales, defaultLocale } = getI18nInfo(collection) as I18nSettings;
  const state = store.getState() as State;

  return {
    collection: collectionName,
    collectionLabel: (collection.label as string | undefined) ?? collectionName,
    slug: entry.newRecord ? null : (entry.slug ?? null),
    newRecord: Boolean(entry.newRecord),
    path: entry.path || null,
    fields: plainValue(fields) as unknown as CmsEditorFieldDefinition[],
    data: plainValue((entry.data ?? {}) as Record<string, unknown>),
    i18n: plainValue(((entry as { i18n?: unknown }).i18n ?? null) as CmsEditorSnapshot['i18n']),
    locales: locales ?? null,
    defaultLocale: defaultLocale ?? null,
    hasChanged: Boolean(state.entryDraft?.hasChanged),
  };
}

function checkValue(field: CmsEntryField, isWholeField: boolean, value: unknown): string | null {
  if (!isWholeField) return null;
  const widget = field.widget as string;
  if ((field as { multiple?: boolean }).multiple && Array.isArray(value)) return null;
  if (STRING_WIDGETS.has(widget) && typeof value !== 'string') return `${widget} fields take a string`;
  if (widget === 'boolean' && typeof value !== 'boolean') return 'boolean fields take true or false';
  if (widget === 'number' && typeof value !== 'number' && typeof value !== 'string') {
    return 'number fields take a number';
  }
  if (widget === 'list' && !Array.isArray(value)) return 'list fields take an array';
  if (widget === 'object' && (value === null || typeof value !== 'object' || Array.isArray(value))) {
    return 'object fields take an object';
  }
  return null;
}

function getAt(source: unknown, path: (string | number)[]): unknown {
  let current = source as Record<string | number, unknown> | undefined;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[key] as Record<string | number, unknown> | undefined;
  }
  return current;
}

/** Sets `value` at `keyPath` inside a copy of `base`, creating arrays for numeric keys. */
function setAt(base: unknown, keyPath: (string | number)[], value: unknown): unknown {
  if (keyPath.length === 0) return value;
  const [head, ...rest] = keyPath;
  const container = Array.isArray(base)
    ? [...base]
    : base !== null && typeof base === 'object'
    ? { ...(base as Record<string, unknown>) }
    : typeof head === 'number'
    ? []
    : {};
  const child = (container as Record<string | number, unknown>)[head];
  (container as Record<string | number, unknown>)[head] = setAt(
    child ?? (typeof rest[0] === 'number' ? [] : {}),
    rest,
    value,
  );
  return container;
}

/**
 * Applies changes to the open entry without saving. Each patch is accepted or
 * refused on its own, with a reason; `locale` targets another i18n language.
 */
export function applyFieldPatch(
  patches: CmsFieldPatch[],
  options: { locale?: string | undefined } = {},
): CmsFieldPatchResult {
  const result: CmsFieldPatchResult = { applied: [], rejected: [] };
  const context = openEntry();
  if (!context) {
    for (const patch of patches) result.rejected.push({ path: patch.path, reason: 'no entry is open' });
    return result;
  }

  const { collection, collectionName, fields, slug } = context;
  const { locales, defaultLocale } = getI18nInfo(collection) as I18nSettings;
  const locale = options.locale ?? defaultLocale;
  if (options.locale && (!locales || !locales.includes(options.locale))) {
    for (const patch of patches) {
      result.rejected.push({ path: patch.path, reason: `this collection has no locale "${options.locale}"` });
    }
    return result;
  }
  const i18n = locales && locale && defaultLocale
    ? { currentLocale: locale, defaultLocale, locales }
    : undefined;
  const dataPath = (i18n && getDataPath(i18n.currentLocale, i18n.defaultLocale)) || ['data'];

  const touched = new Set<string>();
  for (const patch of patches) {
    const segments = String(patch.path).split('.').filter(Boolean);
    const field = fields.find(f => f?.name === segments[0]);
    if (!field) {
      result.rejected.push({ path: patch.path, reason: 'no such field' });
      continue;
    }
    if (field.widget === 'hidden') {
      result.rejected.push({ path: patch.path, reason: 'hidden fields cannot be edited' });
      continue;
    }
    if (i18n && locale !== defaultLocale && !isFieldTranslatable(field, locale!, defaultLocale!)) {
      result.rejected.push({ path: patch.path, reason: `this field is not translated into "${locale}"` });
      continue;
    }
    const problem = checkValue(field, segments.length === 1, patch.value);
    if (problem) {
      result.rejected.push({ path: patch.path, reason: problem });
      continue;
    }

    // Read the draft fresh for every patch: an earlier patch in the same
    // batch may have changed the same field.
    const state = store.getState() as State;
    const entry = state.entryDraft.entry as CmsEntry;
    const valuePath = field.meta ? ['meta', segments[0]] : [...dataPath, segments[0]];
    const current = getAt(entry, valuePath);
    const incoming = plainValue(patch.value);
    let next: unknown;
    if (segments.length === 1) {
      next = incoming;
    } else {
      const keyPath = segments
        .slice(1)
        .map(segment => (/^\d+$/.test(segment) ? Number(segment) : segment));
      const base = current ?? (typeof keyPath[0] === 'number' ? [] : {});
      if (base === null || typeof base !== 'object') {
        result.rejected.push({ path: patch.path, reason: `${segments[0]} has no nested values` });
        continue;
      }
      next = setAt(base, keyPath, incoming);
    }

    const entries = [
      selectUnpublishedEntry(state, collectionName, slug),
      selectEntry(state, collectionName, slug),
    ].filter(Boolean) as CmsEntry[];
    store.dispatch(changeDraftField({ field, value: next, metadata: {}, entries, i18n }));
    result.applied.push(patch.path);
    touched.add(segments[0]);
  }

  if (touched.size > 0) {
    const names = [...touched];
    store.dispatch(markFieldsExternallyChanged(names));
    setTimeout(() => store.dispatch(clearFieldHighlights(names)), HIGHLIGHT_MS);
  }
  return result;
}

/**
 * Calls `listener` with a fresh snapshot (null when no entry is open) on every
 * draft change; debounce in the listener if it does anything expensive.
 */
export function onEditorChange(listener: (snapshot: CmsEditorSnapshot | null) => void): () => void {
  let lastDraft: unknown = undefined;
  return store.subscribe(() => {
    const draft = (store.getState() as State)?.entryDraft;
    if (draft === lastDraft) return;
    lastDraft = draft;
    listener(getCurrentEntry());
  });
}

export const editorApi: CmsEditorApi = { getCurrentEntry, applyFieldPatch, onEditorChange };
