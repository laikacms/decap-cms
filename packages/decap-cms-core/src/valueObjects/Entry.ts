import isBoolean from 'lodash/isBoolean';

import type { MediaFile } from '../backend';

interface Options {
  partial?: boolean;
  raw?: string;
  data?: Record<string, unknown>;
  label?: string | null;
  isModification?: boolean | null;
  mediaFiles?: MediaFile[] | null;
  author?: string;
  updatedOn?: string;
  status?: string;
  meta?: { path?: string };
  i18n?: { [locale: string]: { data: Record<string, unknown> } };
}

export interface EntryValue {
  collection: string;
  slug: string;
  path: string;
  partial: boolean;
  raw: string;
  data: Record<string, unknown>;
  label: string | null;
  isModification: boolean | null;
  mediaFiles: MediaFile[];
  author: string;
  updatedOn: string;
  status?: string;
  meta: { path?: string };
  i18n?: { [locale: string]: { data: Record<string, unknown> } };
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
