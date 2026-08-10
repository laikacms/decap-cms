import { isBoolean } from 'lodash-es';

import type { MediaFile } from '@/core/backend';

// Every field is defaulted below, so callers may pass an explicit `undefined`
// (a value they read off a partially-populated backend payload) to mean
// "use the default".
interface Options {
  partial?: boolean | undefined;
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

export interface EntryValue {
  collection: string;
  slug: string;
  path: string;
  partial: boolean;
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

export function createEntry(collection: string, slug = '', path = '', options: Options = {}) {
  const returnObj: EntryValue = {
    collection,
    slug,
    path,
    partial: options.partial || false,
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

  return returnObj;
}
