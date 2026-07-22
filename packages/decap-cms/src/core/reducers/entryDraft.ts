import { produce } from 'immer';
import { get } from 'lodash-es';

import {
  UNPUBLISHED_ENTRY_PERSIST_FAILURE,
  UNPUBLISHED_ENTRY_PERSIST_REQUEST,
  UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
  UNPUBLISHED_ENTRY_PUBLISH_FAILURE,
  UNPUBLISHED_ENTRY_PUBLISH_REQUEST,
  UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
} from '@/core/actions/editorialWorkflow';
import {
  ADD_DRAFT_ENTRY_MEDIA_FILE,
  DRAFT_CHANGE_FIELD,
  DRAFT_CLEAR_ERRORS,
  DRAFT_CREATE_DUPLICATE_FROM_ENTRY,
  DRAFT_CREATE_EMPTY,
  DRAFT_CREATE_FROM_ENTRY,
  DRAFT_CREATE_FROM_LOCAL_BACKUP,
  DRAFT_DISCARD,
  DRAFT_LOCAL_BACKUP_RETRIEVED,
  DRAFT_VALIDATION_ERRORS,
  ENTRY_DELETE_SUCCESS,
  ENTRY_PERSIST_FAILURE,
  ENTRY_PERSIST_REQUEST,
  ENTRY_PERSIST_SUCCESS,
  REMOVE_DRAFT_ENTRY_MEDIA_FILE,
} from '@/core/actions/entries';
import { duplicateI18nFields, getDataPath } from '@/core/lib/i18n';
import { sanitizeSlug } from '@/core/lib/urlHelper';
import { basename, getNestedValue, join, randomUUID } from '@/lib/util/index';
import { selectFolderEntryExtension, selectHasMetaPath } from './collections';

import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@/lib/util/index';
import type { AnyAction } from 'redux';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;

export type EntryDraft = {
  entry: EntryMap,
  fieldsMetaData?: Record<string, unknown>,
  fieldsErrors?: Record<string, unknown>,
  hasChanged: boolean,
  key: string,
  localBackup?: Omit<EntryDraft, 'localBackup'>,
};

const initialState: EntryDraft = {
  entry: {} as EntryMap,
  fieldsMetaData: {},
  fieldsErrors: {},
  hasChanged: false,
  key: '',
};

function deepMerge(target: any, source: any): any {
  if (source == null) return target;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] ?? {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function setNestedValue(obj: any, path: string[], value: any): any {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  return { ...obj, [head]: setNestedValue(obj?.[head] ?? {}, rest, value) };
}

function deleteNestedKey(obj: any, path: string[]): any {
  if (path.length === 0) return obj;
  if (path.length === 1) {
    const { [path[0]]: _, ...rest } = obj ?? {};
    return rest;
  }
  const [head, ...rest] = path;
  return { ...obj, [head]: deleteNestedKey(obj?.[head], rest) };
}

const entryDraftReducer = produce((state: EntryDraft, action: AnyAction): EntryDraft | void => {
  switch (action.type) {
    case DRAFT_CREATE_FROM_ENTRY:
      return {
        ...initialState,
        entry: { ...action.payload.entry, newRecord: false },
        key: randomUUID(),
        // Carry over a not-yet-decided `localBackup` (DCMS-1157): this
        // dispatch and `retrieveLocalBackup`'s `DRAFT_LOCAL_BACKUP_RETRIEVED`
        // both fire from `useEditor`'s mount `setup()` with no ordering
        // guarantee between them. Replacing the whole slice with
        // `...initialState` when this one lands second would silently drop
        // the backup the user hasn't been asked about yet, leaving the
        // eventual OK click on the recovery dialog with nothing to restore.
        localBackup: state.localBackup,
      };

    case DRAFT_CREATE_EMPTY:
      return {
        ...initialState,
        entry: { ...action.payload, newRecord: true },
        key: randomUUID(),
        // See the comment on `DRAFT_CREATE_FROM_ENTRY` above — same race,
        // same fix, for the new-entry path (DCMS-1157). Without this,
        // `createEmptyDraft`'s DCMS-1149 guard doesn't help: it only bails
        // once `hasChanged` is `true`, which only happens after the user
        // clicks OK; a backup that has merely been *retrieved* still gets
        // wiped out here if `createEmptyDraft` resolves before that click.
        localBackup: state.localBackup,
      };

    case DRAFT_CREATE_FROM_LOCAL_BACKUP: {
      const backupEntry = state.localBackup?.entry;
      const { localBackup: _, ...rest } = state as any;
      return {
        ...rest,
        entry: { ...backupEntry, newRecord: !backupEntry?.path },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: true,
        key: randomUUID(),
      };
    }

    case DRAFT_CREATE_DUPLICATE_FROM_ENTRY:
      return {
        ...initialState,
        entry: { ...action.payload, newRecord: true },
        hasChanged: true,
        key: randomUUID(),
      };

    case DRAFT_DISCARD:
      return initialState;

    case DRAFT_LOCAL_BACKUP_RETRIEVED: {
      const { entry } = action.payload;
      state.localBackup = { entry, fieldsErrors: {}, hasChanged: false, key: '' };
      break;
    }

    case DRAFT_CHANGE_FIELD: {
      const { field, value, metadata, entries, i18n } = action.payload as {
        field: EntryField,
        value: unknown,
        metadata: (Record<string, unknown> & { fromDefault?: boolean }) | undefined,
        entries: EntryMap[],
        i18n?: {
          currentLocale: string,
          defaultLocale: string,
          locales: string[],
        },
      };
      const name = field.name;
      const meta = field.meta;
      const dataPath = (i18n && getDataPath(i18n.currentLocale, i18n.defaultLocale)) || ['data'];

      // `fromDefault` marks a value substitution the framework performed on
      // mount (e.g. datetime's `{{now}}` default) rather than a user edit.
      // On a brand-new entry it must not flip `hasChanged`, otherwise a
      // freshly opened form shows "unsaved changes" before anyone types
      // anything (DCMS-416). The flag itself is not real field metadata, so
      // it's stripped before merging into fieldsMetaData.
      const { fromDefault, ...restMetadata } = metadata ?? {};
      const isNewRecord = (state.entry as any).newRecord;
      const previousData = getNestedValue(state.entry, dataPath);
      const previousMeta = (state.entry as any).meta;

      if (meta) {
        state.entry = setNestedValue(state.entry, ['meta', name as string], value) as EntryMap;
      } else {
        state.entry = setNestedValue(state.entry, [...dataPath, name as string], value) as EntryMap;
        if (i18n) {
          duplicateI18nFields(state as any, field, i18n.locales, i18n.defaultLocale);
        }
      }
      state.fieldsMetaData = deepMerge(state.fieldsMetaData ?? {}, restMetadata);

      if (!(fromDefault && isNewRecord)) {
        const newData = getNestedValue(state.entry, dataPath);
        const newMeta = (state.entry as any).meta;

        // A write that reproduces exactly what's already in the draft is a
        // no-op regardless of what the (possibly stale) `entries` baseline
        // says (DCMS-1363). This matters right after a persist: widgets can
        // re-dispatch a field write as a side effect of the post-save reload
        // (e.g. a datetime widget's `{{now}}` default), and `entries` here
        // is a snapshot closed over before the persist landed, so it can
        // still hold the pre-save value. Diffing against that stale
        // snapshot made an identical rewrite look like a real edit and
        // flipped `hasChanged` back to `true` immediately after save.
        const isNoOpWrite =
          JSON.stringify(newData) === JSON.stringify(previousData) &&
          JSON.stringify(newMeta) === JSON.stringify(previousMeta);

        if (!isNoOpWrite) {
          state.hasChanged = !entries.some((e: any) => {
            const eData = getNestedValue(e, dataPath);
            return JSON.stringify(newData) === JSON.stringify(eData);
          }) || !entries.some((e: any) => JSON.stringify(newMeta) === JSON.stringify(e.meta));
        }
      }
      break;
    }

    case DRAFT_VALIDATION_ERRORS:
      if (action.payload.errors.length === 0) {
        const { [action.payload.uniquefieldId]: _, ...rest } = state.fieldsErrors ?? {};
        state.fieldsErrors = rest;
      } else {
        state.fieldsErrors = {
          ...state.fieldsErrors,
          [action.payload.uniquefieldId]: action.payload.errors,
        };
      }
      break;

    case DRAFT_CLEAR_ERRORS: {
      const { uniqueFieldId } = action.payload;
      const { [uniqueFieldId]: _, ...rest } = state.fieldsErrors ?? {};
      state.fieldsErrors = rest;
      break;
    }

    case ENTRY_PERSIST_REQUEST:
    case UNPUBLISHED_ENTRY_PERSIST_REQUEST:
      state.entry = { ...state.entry, isPersisting: true };
      break;

    case ENTRY_PERSIST_FAILURE:
    case UNPUBLISHED_ENTRY_PERSIST_FAILURE: {
      const { isPersisting: _, ...rest } = state.entry as any;
      state.entry = rest;
      break;
    }

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST:
      state.entry = { ...state.entry, isUpdatingStatus: true } as any;
      break;

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE:
    case UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS: {
      const { isUpdatingStatus: _, ...rest } = state.entry as any;
      state.entry = rest;
      break;
    }

    case UNPUBLISHED_ENTRY_PUBLISH_REQUEST:
      state.entry = { ...state.entry, isPublishing: true } as any;
      break;

    case UNPUBLISHED_ENTRY_PUBLISH_SUCCESS:
    case UNPUBLISHED_ENTRY_PUBLISH_FAILURE: {
      const { isPublishing: _, ...rest } = state.entry as any;
      state.entry = rest;
      break;
    }

    case ENTRY_PERSIST_SUCCESS:
    case UNPUBLISHED_ENTRY_PERSIST_SUCCESS: {
      const { isPersisting: _, ...rest } = state.entry as any;
      state.entry = rest;
      state.hasChanged = false;
      if (!state.entry.slug) {
        state.entry = { ...state.entry, slug: action.payload.slug };
      }
      break;
    }

    case ENTRY_DELETE_SUCCESS: {
      const { isPersisting: _, ...rest } = state.entry as any;
      state.entry = rest;
      state.hasChanged = false;
      break;
    }

    case ADD_DRAFT_ENTRY_MEDIA_FILE: {
      const mediaFiles = (state.entry.mediaFiles ?? []).filter(
        (file: any) => file.id !== action.payload.id,
      );
      state.entry = { ...state.entry, mediaFiles: [action.payload, ...mediaFiles] };
      state.hasChanged = true;
      break;
    }

    case REMOVE_DRAFT_ENTRY_MEDIA_FILE: {
      state.entry = {
        ...state.entry,
        mediaFiles: (state.entry.mediaFiles ?? []).filter(
          (file: any) => file.id !== action.payload.id,
        ),
      };
      state.hasChanged = true;
      break;
    }
  }
}, initialState);

function cleanTitleForFilename(title?: string): string {
  if (!title) return 'untitled';

  const cleanedTitle = sanitizeSlug(title.toString().toLowerCase().trim(), {
    sanitize_replacement: '-',
    encoding: 'unicode',
  });

  return cleanedTitle || 'untitled';
}

export function selectCustomPath(
  collection: Collection,
  entryDraft: EntryDraft,
): string | undefined {
  if (!selectHasMetaPath(collection)) return;
  const meta = entryDraft.entry?.meta;
  const path = meta?.path;

  if (!path) return;

  const extension = selectFolderEntryExtension(collection);
  const indexFile = get(collection, ['meta', 'path', 'index_file']);

  // If index_file is specified, use the old behavior for backward compatibility
  if (indexFile) {
    return join(collection.folder as string, path, `${indexFile}.${extension}`);
  }

  // New behavior: generate filename from entry title
  const isNewEntry = entryDraft.entry?.newRecord;
  const currentPath = entryDraft.entry?.path;

  let filename: string;
  if (isNewEntry || !currentPath) {
    const title = (entryDraft.entry?.data as Record<string, unknown> | undefined)?.title as
      | string
      | undefined;
    filename = cleanTitleForFilename(title);
  } else {
    filename = basename(currentPath, `.${extension}`);
  }

  return join(collection.folder as string, path, `${filename}.${extension}`);
}

export default entryDraftReducer;
