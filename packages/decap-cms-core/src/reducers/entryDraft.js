import { v4 as uuid } from 'uuid';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';
import { join, basename } from 'path';

import { sanitizeSlug } from '../lib/urlHelper';
import {
  DRAFT_CREATE_FROM_ENTRY,
  DRAFT_CREATE_EMPTY,
  DRAFT_DISCARD,
  DRAFT_CHANGE_FIELD,
  DRAFT_VALIDATION_ERRORS,
  DRAFT_CLEAR_ERRORS,
  DRAFT_LOCAL_BACKUP_RETRIEVED,
  DRAFT_CREATE_FROM_LOCAL_BACKUP,
  DRAFT_CREATE_DUPLICATE_FROM_ENTRY,
  ENTRY_PERSIST_REQUEST,
  ENTRY_PERSIST_SUCCESS,
  ENTRY_PERSIST_FAILURE,
  ENTRY_DELETE_SUCCESS,
  ADD_DRAFT_ENTRY_MEDIA_FILE,
  REMOVE_DRAFT_ENTRY_MEDIA_FILE,
} from '../actions/entries';
import {
  UNPUBLISHED_ENTRY_PERSIST_REQUEST,
  UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
  UNPUBLISHED_ENTRY_PERSIST_FAILURE,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE,
  UNPUBLISHED_ENTRY_PUBLISH_REQUEST,
  UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
  UNPUBLISHED_ENTRY_PUBLISH_FAILURE,
} from '../actions/editorialWorkflow';
import { selectFolderEntryExtension, selectHasMetaPath } from './collections';
import { getDataPath, duplicateI18nFields } from '../lib/i18n';

const initialState = {
  entry: {},
  fieldsMetaData: {},
  fieldsErrors: {},
  hasChanged: false,
  key: '',
};

function entryDraftReducer(state = {}, action) {
  switch (action.type) {
    case DRAFT_CREATE_FROM_ENTRY:
      // Existing Entry
      return {
        ...state,
        entry: { ...action.payload.entry, newRecord: false },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: false,
        key: uuid(),
      };
    case DRAFT_CREATE_EMPTY:
      // New Entry
      return {
        ...state,
        entry: { ...action.payload, newRecord: true },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: false,
        key: uuid(),
      };
    case DRAFT_CREATE_FROM_LOCAL_BACKUP: {
      // Local Backup
      const backupDraftEntry = state.localBackup;
      const backupEntry = backupDraftEntry.entry;
      const { localBackup: _, ...stateWithoutBackup } = state;
      return {
        ...stateWithoutBackup,
        entry: { ...backupEntry, newRecord: !backupEntry.path },
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: true,
        key: uuid(),
      };
    }
    case DRAFT_CREATE_DUPLICATE_FROM_ENTRY:
      // Duplicate Entry
      return {
        ...state,
        entry: { ...action.payload, newRecord: true },
        mediaFiles: [],
        fieldsMetaData: {},
        fieldsErrors: {},
        hasChanged: true,
      };
    case DRAFT_DISCARD:
      return initialState;
    case DRAFT_LOCAL_BACKUP_RETRIEVED: {
      const { entry } = action.payload;
      return {
        ...state,
        localBackup: { entry },
      };
    }
    case DRAFT_CHANGE_FIELD: {
      const { field, value, metadata, entries, i18n } = action.payload;
      const name = field.name;
      const meta = field.meta;

      const dataPath = (i18n && getDataPath(i18n.currentLocale, i18n.defaultLocale)) || ['data'];

      let newState;
      if (meta) {
        newState = {
          ...state,
          entry: {
            ...state.entry,
            meta: {
              ...(state.entry?.meta ?? {}),
              [name]: value,
            },
          },
        };
      } else {
        // Build nested path for dataPath
        let entryData = { ...(state.entry ?? {}) };
        // Set deeply nested value
        const fullPath = ['entry', ...dataPath, name];
        let obj = { ...entryData };
        // Use a manual deep-set
        const setDeep = (target, pathArr, val) => {
          const key = pathArr[0];
          if (pathArr.length === 1) {
            return { ...target, [key]: val };
          }
          return { ...target, [key]: setDeep(target[key] ?? {}, pathArr.slice(1), val) };
        };
        entryData = setDeep(state.entry ?? {}, [...dataPath, name], value);
        newState = { ...state, entry: entryData };
        if (i18n) {
          newState = duplicateI18nFields(newState, field, i18n.locales, i18n.defaultLocale);
        }
      }

      const newFieldsMetaData = merge({}, newState.fieldsMetaData ?? {}, metadata ?? {});
      newState = { ...newState, fieldsMetaData: newFieldsMetaData };

      const newData = get(newState.entry, dataPath);
      const newMeta = newState.entry?.meta;
      const hasChanged =
        !entries.some(e => isEqual(newData, get(e, dataPath))) ||
        !entries.some(e => isEqual(newMeta, e.meta));
      newState = { ...newState, hasChanged };

      return newState;
    }
    case DRAFT_VALIDATION_ERRORS:
      if (action.payload.errors.length === 0) {
        const { [action.payload.uniquefieldId]: _, ...fieldsErrors } = state.fieldsErrors ?? {};
        return { ...state, fieldsErrors };
      } else {
        return {
          ...state,
          fieldsErrors: {
            ...state.fieldsErrors,
            [action.payload.uniquefieldId]: action.payload.errors,
          },
        };
      }

    case DRAFT_CLEAR_ERRORS: {
      const { uniqueFieldId } = action.payload;
      const { [uniqueFieldId]: _, ...fieldsErrors } = state.fieldsErrors ?? {};
      return { ...state, fieldsErrors };
    }

    case ENTRY_PERSIST_REQUEST:
    case UNPUBLISHED_ENTRY_PERSIST_REQUEST: {
      return {
        ...state,
        entry: { ...state.entry, isPersisting: true },
      };
    }

    case ENTRY_PERSIST_FAILURE:
    case UNPUBLISHED_ENTRY_PERSIST_FAILURE: {
      const { isPersisting: _, ...entry } = state.entry ?? {};
      return { ...state, entry };
    }

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST:
      return {
        ...state,
        entry: { ...state.entry, isUpdatingStatus: true },
      };

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE:
    case UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS: {
      const { isUpdatingStatus: _, ...entry } = state.entry ?? {};
      return { ...state, entry };
    }

    case UNPUBLISHED_ENTRY_PUBLISH_REQUEST:
      return {
        ...state,
        entry: { ...state.entry, isPublishing: true },
      };

    case UNPUBLISHED_ENTRY_PUBLISH_SUCCESS:
    case UNPUBLISHED_ENTRY_PUBLISH_FAILURE: {
      const { isPublishing: _, ...entry } = state.entry ?? {};
      return { ...state, entry };
    }

    case ENTRY_PERSIST_SUCCESS:
    case UNPUBLISHED_ENTRY_PERSIST_SUCCESS: {
      const { isPersisting: _, ...entry } = state.entry ?? {};
      return {
        ...state,
        entry: {
          ...entry,
          ...(entry.slug ? {} : { slug: action.payload.slug }),
        },
        hasChanged: false,
      };
    }

    case ENTRY_DELETE_SUCCESS: {
      const { isPersisting: _, ...entry } = state.entry ?? {};
      return {
        ...state,
        entry,
        hasChanged: false,
      };
    }

    case ADD_DRAFT_ENTRY_MEDIA_FILE: {
      const mediaFiles = state.entry?.mediaFiles ?? [];
      return {
        ...state,
        entry: {
          ...state.entry,
          mediaFiles: [
            action.payload,
            ...mediaFiles.filter(file => file.id !== action.payload.id),
          ],
        },
        hasChanged: true,
      };
    }

    case REMOVE_DRAFT_ENTRY_MEDIA_FILE: {
      const mediaFiles = state.entry?.mediaFiles ?? [];
      return {
        ...state,
        entry: {
          ...state.entry,
          mediaFiles: mediaFiles.filter(file => file.id !== action.payload.id),
        },
        hasChanged: true,
      };
    }

    default:
      return state;
  }
}

function cleanTitleForFilename(title) {
  if (!title) return 'untitled';

  const cleanedTitle = sanitizeSlug(title.toString().toLowerCase().trim(), {
    sanitize_replacement: '-',
    encoding: 'unicode',
  });

  return cleanedTitle || 'untitled';
}

export function selectCustomPath(collection, entryDraft) {
  if (!selectHasMetaPath(collection)) {
    return;
  }
  const meta = entryDraft.entry?.meta;
  const path = meta?.path;

  if (!path) {
    return;
  }

  const extension = selectFolderEntryExtension(collection);
  const indexFile = get(collection, ['meta', 'path', 'index_file']);

  // If index_file is specified, use the old behavior for backward compatibility
  if (indexFile) {
    const customPath = join(collection.folder, path, `${indexFile}.${extension}`);
    return customPath;
  }

  // New behavior: generate filename from entry title
  const isNewEntry = entryDraft.entry?.newRecord;
  const currentPath = entryDraft.entry?.path;

  let filename;
  if (isNewEntry || !currentPath) {
    // For new entries, generate filename from title
    const entryData = entryDraft.entry?.data;
    const title = entryData?.title;
    filename = cleanTitleForFilename(title);
  } else {
    // For existing entries, preserve the current filename
    const currentFilename = basename(currentPath, `.${extension}`);
    filename = currentFilename;
  }

  const customPath = join(collection.folder, path, `${filename}.${extension}`);
  return customPath;
}

export default entryDraftReducer;
