import { Map, List, fromJS } from 'immutable';
import { v4 as uuid } from 'uuid';
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

const initialState = Map({
  entry: Map(),
  fieldsMetaData: Map(),
  fieldsErrors: Map(),
  hasChanged: false,
  key: '',
});

function entryDraftReducer(state = Map(), action) {
  switch (action.type) {
    case DRAFT_CREATE_FROM_ENTRY:
      // Existing Entry
      return state.withMutations(state => {
        state.set('entry', fromJS(action.payload.entry));
        state.setIn(['entry', 'newRecord'], false);
        state.set('fieldsMetaData', Map());
        state.set('fieldsErrors', Map());
        state.set('hasChanged', false);
        state.set('key', uuid());
      });
    case DRAFT_CREATE_EMPTY:
      // New Entry
      return state.withMutations(state => {
        state.set('entry', fromJS(action.payload));
        state.setIn(['entry', 'newRecord'], true);
        state.set('fieldsMetaData', Map());
        state.set('fieldsErrors', Map());
        state.set('hasChanged', false);
        state.set('key', uuid());
      });
    case DRAFT_CREATE_FROM_LOCAL_BACKUP:
      // Local Backup
      return state.withMutations(state => {
        const backupDraftEntry = state.get('localBackup');
        const backupEntry = backupDraftEntry.get('entry');
        state.delete('localBackup');
        state.set('entry', backupEntry);
        state.setIn(['entry', 'newRecord'], !backupEntry.get('path'));
        state.set('fieldsMetaData', Map());
        state.set('fieldsErrors', Map());
        state.set('hasChanged', true);
        state.set('key', uuid());
      });
    case DRAFT_CREATE_DUPLICATE_FROM_ENTRY:
      // Duplicate Entry
      return state.withMutations(state => {
        state.set('entry', fromJS(action.payload));
        state.setIn(['entry', 'newRecord'], true);
        state.set('mediaFiles', List());
        state.set('fieldsMetaData', Map());
        state.set('fieldsErrors', Map());
        state.set('hasChanged', true);
      });
    case DRAFT_DISCARD:
      return initialState;
    case DRAFT_LOCAL_BACKUP_RETRIEVED: {
      const { entry } = action.payload;
      const newState = new Map({
        entry: fromJS(entry),
      });
      return state.set('localBackup', newState);
    }
    case DRAFT_CHANGE_FIELD: {
      return state.withMutations(state => {
        const { field, value, metadata, i18n } = action.payload;
        const name = field.get('name');
        const meta = field.get('meta');

        const dataPath = (i18n && getDataPath(i18n.currentLocale, i18n.defaultLocale)) || ['data'];
        // Snapshot the pre-mutation values so a mount-time write that
        // resolves to the exact same data/meta the draft already held can be
        // recognized as a no-op below, regardless of which widget performed
        // it or whether it tagged itself `fromDefault`.
        const oldData = state.getIn(['entry', ...dataPath]);
        const oldMeta = state.getIn(['entry', 'meta']);
        if (meta) {
          state.setIn(['entry', 'meta', name], value);
        } else {
          state.setIn(['entry', ...dataPath, name], value);
          if (i18n) {
            state = duplicateI18nFields(state, field, i18n.locales, i18n.defaultLocale);
          }
        }
        // `fromDefault` marks a value substitution the framework performed
        // on mount (e.g. datetime's `{{now}}` default) rather than a user
        // edit. It must not flip `hasChanged`, otherwise a freshly opened
        // form shows "unsaved changes" before anyone types anything. This
        // applies to brand-new entries (DCMS-416/DCMS-487) as well as
        // existing entries with a field left blank/default-driven
        // (DCMS-528) — an unfilled field falls back to the same
        // framework-provided default regardless of `newRecord`. The flag
        // itself is not real field metadata, so it's stripped before
        // merging into fieldsMetaData.
        const { fromDefault, ...restMetadata } = metadata ?? {};

        state.mergeDeepIn(['fieldsMetaData'], fromJS(restMetadata));

        const newData = state.getIn(['entry', ...dataPath]) ?? Map();
        const newMeta = state.getIn(['entry', 'meta']) ?? Map();

        // A widget can dispatch a mount-time write that resolves to the same
        // effective data/meta the draft already held (e.g. re-serializing an
        // already-loaded value, or filling in a default that matches what
        // was already there) without tagging it `fromDefault` (DCMS-560:
        // RichtextControl/BooleanControl/MarkdownControl/ListControl never
        // did, unlike DateTimeControl). Detecting that generically — did
        // this action actually change anything — means `hasChanged` no
        // longer depends on every widget opting into the `fromDefault` tag.
        const isNoOpWrite = newData.equals(oldData ?? Map()) && newMeta.equals(oldMeta ?? Map());

        // `hasChanged` used to be recomputed here by diffing `newData`
        // against the `entries` baseline (the redux-selected
        // published/unpublished entry) rather than against the draft
        // itself. That baseline can lag a beat behind an
        // ENTRY_PERSIST_SUCCESS/UNPUBLISHED_ENTRY_PERSIST_SUCCESS +
        // reload-from-backend cycle for editorial-workflow entries: the
        // reload dispatches DRAFT_CREATE_FROM_ENTRY (new `key`, remounting
        // every widget) before the unpublished/published entry selectors
        // catch up, so a widget's post-reload mount write that merely
        // re-affirms the just-persisted value could be diffed against a
        // stale pre-persist baseline and wrongly flip `hasChanged` back to
        // `true` right after a successful save (DCMS-1727, a main-branch
        // regression of the same class of bug DCMS-1363/#1364 fixed on
        // v4.beta). `oldData`/`oldMeta` (the draft's own value the instant
        // before this write) is always current, so once we already know
        // this write isn't a no-op against it, that's sufficient on its own
        // to call it a real change — no separate, potentially-stale
        // baseline is needed.
        if (!fromDefault && !isNoOpWrite) {
          state.set('hasChanged', true);
        }
      });
    }
    case DRAFT_VALIDATION_ERRORS:
      if (action.payload.errors.length === 0) {
        return state.deleteIn(['fieldsErrors', action.payload.uniquefieldId]);
      } else {
        return state.setIn(['fieldsErrors', action.payload.uniquefieldId], action.payload.errors);
      }

    case DRAFT_CLEAR_ERRORS: {
      const { uniqueFieldId } = action.payload;
      return state.deleteIn(['fieldsErrors', uniqueFieldId]);
    }

    case ENTRY_PERSIST_REQUEST:
    case UNPUBLISHED_ENTRY_PERSIST_REQUEST: {
      return state.setIn(['entry', 'isPersisting'], true);
    }

    case ENTRY_PERSIST_FAILURE:
    case UNPUBLISHED_ENTRY_PERSIST_FAILURE: {
      return state.deleteIn(['entry', 'isPersisting']);
    }

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST:
      return state.setIn(['entry', 'isUpdatingStatus'], true);

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE:
    case UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS:
      return state.deleteIn(['entry', 'isUpdatingStatus']);

    case UNPUBLISHED_ENTRY_PUBLISH_REQUEST:
      return state.setIn(['entry', 'isPublishing'], true);

    case UNPUBLISHED_ENTRY_PUBLISH_SUCCESS:
    case UNPUBLISHED_ENTRY_PUBLISH_FAILURE:
      return state.deleteIn(['entry', 'isPublishing']);

    case ENTRY_PERSIST_SUCCESS:
    case UNPUBLISHED_ENTRY_PERSIST_SUCCESS:
      return state.withMutations(state => {
        state.deleteIn(['entry', 'isPersisting']);
        state.set('hasChanged', false);
        if (!state.getIn(['entry', 'slug'])) {
          state.setIn(['entry', 'slug'], action.payload.slug);
        }
      });

    case ENTRY_DELETE_SUCCESS:
      return state.withMutations(state => {
        state.deleteIn(['entry', 'isPersisting']);
        state.set('hasChanged', false);
      });

    case ADD_DRAFT_ENTRY_MEDIA_FILE: {
      return state.withMutations(state => {
        const mediaFiles = state.getIn(['entry', 'mediaFiles']);

        state.setIn(
          ['entry', 'mediaFiles'],
          mediaFiles
            .filterNot(file => file.get('id') === action.payload.id)
            .insert(0, fromJS(action.payload)),
        );
        state.set('hasChanged', true);
      });
    }

    case REMOVE_DRAFT_ENTRY_MEDIA_FILE: {
      return state.withMutations(state => {
        const mediaFiles = state.getIn(['entry', 'mediaFiles']);

        state.setIn(
          ['entry', 'mediaFiles'],
          mediaFiles.filterNot(file => file.get('id') === action.payload.id),
        );
        state.set('hasChanged', true);
      });
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
  const meta = entryDraft.getIn(['entry', 'meta']);
  const path = meta && meta.get('path');

  if (!path) {
    return;
  }

  const extension = selectFolderEntryExtension(collection);
  const indexFile = collection.meta?.get('path')?.get('index_file');

  // If index_file is specified, use the old behavior for backward compatibility
  if (indexFile) {
    const customPath = join(collection.folder, path, `${indexFile}.${extension}`);
    return customPath;
  }

  // New behavior: generate filename from entry title
  const isNewEntry = entryDraft.getIn(['entry', 'newRecord']);
  const currentPath = entryDraft.getIn(['entry', 'path']);

  let filename;
  if (isNewEntry || !currentPath) {
    // For new entries, generate filename from title
    const entryData = entryDraft.getIn(['entry', 'data']);
    const title = entryData && entryData.get('title');
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
