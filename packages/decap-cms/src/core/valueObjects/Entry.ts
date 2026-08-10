import { isBoolean } from 'lodash-es';

import type { MediaFile } from '@/core/backend';

// Every field is defaulted below, so callers may pass an explicit `undefined`
// (a value they read off a partially-populated backend payload) to mean
// "use the default".
interface Options {
  raw?: string | undefined;

  data?: any;
  label?: string | null | undefined;
  isModification?: boolean | null | undefined;
  mediaFiles?: MediaFile[] | null | undefined;
  author?: string | undefined;
  updatedOn?: string | undefined;
  status?: string | undefined;
  meta?: { path?: string | undefined } | undefined;
  i18n?: {
    [locale: string]: any,
  } | undefined;
}

interface EntryValueBase {
  collection: string;
  slug: string;
  path: string;
  raw: string;

  data: any;
  label: string | null;
  isModification: boolean | null;
  mediaFiles: MediaFile[];
  author: string;
  updatedOn: string;
  status?: string;
  meta: { path?: string | undefined };
  i18n?: {
    [locale: string]: any,
  };
}

/**
 * An entry loaded in full, so it is safe to edit, persist and publish. The
 * engine's transitional stand-in for `lib/domain`'s `CompleteEntry`; the two
 * converge when the store adopts the domain type (DCMS-1907, stage 4).
 */
export type CompleteEntryValue = EntryValueBase & { projected: false };

/**
 * An entry that came from a projection - a search index returning only the
 * fields it stores. Displayable, never writable: everything that writes takes
 * `CompleteEntryValue`, so reaching one of those with a projection is a
 * compile error whose fix is a refetch, never a cast.
 */
export type ProjectedEntryValue = EntryValueBase & { projected: true };

export type EntryValue = CompleteEntryValue | ProjectedEntryValue;

function entryFields(collection: string, slug: string, path: string, options: Options) {
  return {
    collection,
    slug,
    path,
    raw: options.raw || '',
    data: options.data || {},
    label: options.label || null,
    isModification: isBoolean(options.isModification) ? options.isModification : null,
    mediaFiles: options.mediaFiles || [],
    author: options.author || '',
    updatedOn: options.updatedOn || '',
    status: options.status || '',
    meta: options.meta || {},
    i18n: options.i18n || {},
  };
}

/** Builds a fully loaded entry. */
export function createEntry(
  collection: string,
  slug = '',
  path = '',
  options: Options = {},
): CompleteEntryValue {
  return { ...entryFields(collection, slug, path, options), projected: false };
}

/** Builds an entry from a projection; see {@link ProjectedEntryValue}. */
export function createProjectedEntry(
  collection: string,
  slug = '',
  path = '',
  options: Options = {},
): ProjectedEntryValue {
  return { ...entryFields(collection, slug, path, options), projected: true };
}

export function isProjectedEntry(entry: { projected?: boolean }): boolean {
  return entry.projected === true;
}
