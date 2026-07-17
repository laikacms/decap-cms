import { produce } from 'immer';
import { v4 as uuid } from 'uuid';

import {
  MEDIA_DELETE_FAILURE,
  MEDIA_DELETE_REQUEST,
  MEDIA_DELETE_SUCCESS,
  MEDIA_DISPLAY_URL_FAILURE,
  MEDIA_DISPLAY_URL_REQUEST,
  MEDIA_DISPLAY_URL_SUCCESS,
  MEDIA_INSERT,
  MEDIA_LIBRARY_CLOSE,
  MEDIA_LIBRARY_CREATE,
  MEDIA_LIBRARY_OPEN,
  MEDIA_LOAD_FAILURE,
  MEDIA_LOAD_REQUEST,
  MEDIA_LOAD_SUCCESS,
  MEDIA_PERSIST_FAILURE,
  MEDIA_PERSIST_REQUEST,
  MEDIA_PERSIST_SUCCESS,
  MEDIA_REMOVE_INSERTED,
} from '@/core/actions/mediaLibrary';
import { dirname } from '@/lib/util/index';
import { selectEditingDraft, selectMediaFolder } from './entries';
import { selectIntegration as selectIntegrationDirect } from './integrations';

import type { MediaLibraryAction } from '@/core/actions/mediaLibrary';
import type {
  CmsCollections,
  CmsConfig,
  CmsEntry,
  CmsEntryField,
  CmsMediaFile,
  CmsMediaFileMap,
  CmsMediaLibraryInstance,
} from '@/lib/util/index';

type DisplayURLState = {
  isFetching: boolean,
  url?: string,
  err?: Error | boolean,
};

type MediaLibrary = {
  externalLibrary?: CmsMediaLibraryInstance,
  files: CmsMediaFile[],
  displayURLs: Record<string, DisplayURLState>,
  isLoading: boolean,
  isVisible: boolean,
  showMediaButton: boolean,
  controlMedia: Record<string, string | string[]>,
  controlID?: string,
  page?: number,
  config: Record<string, unknown>,
  field?: CmsEntryField,
  value?: string | string[],
  replaceIndex?: number | boolean,
  forImage?: boolean,
  canInsert?: boolean,
  privateUpload?: boolean,
  isPersisting?: boolean,
  isDeleting?: boolean,
  hasNextPage?: boolean,
  isPaginating?: boolean,
  dynamicSearch?: boolean,
  dynamicSearchActive?: boolean,
  dynamicSearchQuery?: string,
  /** Continuation cursor from a paginated backend; absent when exhausted. */
  cursor?: string,
};

type Integrations = {
  hooks: { [collectionOrHook: string]: any },
  providers?: Record<string, unknown>,
};

type EntryDraft = {
  entry: CmsEntry,
  fieldsErrors?: Record<string, unknown>,
  fieldsMetaData?: Record<string, unknown>,
  hasChanged: boolean,
  key: string,
};

type State = {
  config: CmsConfig,
  collections: CmsCollections,
  mediaLibrary: MediaLibrary,
  entryDraft: EntryDraft,
  integrations: Integrations,
};

const defaultState: MediaLibrary = {
  isVisible: false,
  showMediaButton: true,
  controlMedia: {},
  displayURLs: {},
  config: {},
  files: [],
  isLoading: false,
};

const mediaLibrary = produce((state: MediaLibrary, action: MediaLibraryAction) => {
  switch (action.type) {
    case MEDIA_LIBRARY_CREATE:
      state.externalLibrary = action.payload as CmsMediaLibraryInstance;
      state.showMediaButton = (action.payload as CmsMediaLibraryInstance).enableStandalone();
      break;

    case MEDIA_LIBRARY_OPEN: {
      const { controlID, forImage, privateUpload, config, field, value, replaceIndex } = action.payload;
      const libConfig = config ?? {};
      const privateUploadChanged = state.privateUpload !== privateUpload;
      if (privateUploadChanged) {
        return {
          ...defaultState,
          isVisible: true,
          forImage,
          controlID,
          canInsert: !!controlID,
          privateUpload,
          config: libConfig,
          field,
          value,
          replaceIndex,
        };
      }
      state.isVisible = true;
      state.forImage = forImage ?? false;
      state.controlID = controlID ?? '';
      state.canInsert = !!controlID;
      state.privateUpload = privateUpload;
      state.config = libConfig;
      state.field = field ?? undefined;
      state.value = value === '' && libConfig.multiple ? [] : (value ?? '');
      state.replaceIndex = replaceIndex ?? false;
      break;
    }

    case MEDIA_LIBRARY_CLOSE:
      state.isVisible = false;
      break;

    case MEDIA_INSERT: {
      const { mediaPath } = action.payload;
      const { controlID, value } = state;

      if (!Array.isArray(value)) {
        state.controlMedia[controlID!] = mediaPath as string;
        break;
      }

      const replaceIndex = state.replaceIndex;
      const mediaArray = Array.isArray(mediaPath) ? mediaPath : [mediaPath];
      const valueArray = [...(value as string[])];
      if (typeof replaceIndex === 'number') {
        valueArray[replaceIndex] = mediaArray[0];
      } else {
        valueArray.push(...mediaArray);
      }
      state.controlMedia[controlID!] = valueArray;
      break;
    }

    case MEDIA_REMOVE_INSERTED:
      state.controlMedia[action.payload.controlID] = '';
      break;

    case MEDIA_LOAD_REQUEST:
      state.isLoading = true;
      state.isPaginating = action.payload.page > 1;
      break;

    case MEDIA_LOAD_SUCCESS: {
      const {
        files = [],
        page,
        canPaginate,
        dynamicSearch,
        dynamicSearchQuery,
        privateUpload,
        hasNextPage,
        cursor,
      } = action.payload;
      if (state.privateUpload !== privateUpload) break;

      const filesWithKeys = files.map((file: CmsMediaFile) => ({ ...file, key: uuid() }));
      state.isLoading = false;
      state.isPaginating = false;
      state.page = page ?? 1;
      // Cursor-paginated backends state hasNextPage explicitly; the length
      // heuristic stays for the integration path, which has no cursor.
      state.hasNextPage = hasNextPage ?? !!(canPaginate && files.length > 0);
      state.cursor = cursor;
      state.dynamicSearch = dynamicSearch ?? false;
      state.dynamicSearchQuery = dynamicSearchQuery ?? '';
      state.dynamicSearchActive = !!dynamicSearchQuery;
      if (page && page > 1) {
        state.files = (state.files ?? []).concat(filesWithKeys);
      } else {
        state.files = filesWithKeys;
      }
      break;
    }

    case MEDIA_LOAD_FAILURE:
      if (state.privateUpload !== action.payload.privateUpload) break;
      state.isLoading = false;
      break;

    case MEDIA_PERSIST_REQUEST:
      state.isPersisting = true;
      break;

    case MEDIA_PERSIST_SUCCESS: {
      const { file, privateUpload } = action.payload;
      if (state.privateUpload !== privateUpload) break;
      const fileWithKey = { ...file, key: uuid() };
      state.files = [fileWithKey, ...(state.files ?? [])];
      state.isPersisting = false;
      break;
    }

    case MEDIA_PERSIST_FAILURE:
      if (state.privateUpload !== action.payload.privateUpload) break;
      state.isPersisting = false;
      break;

    case MEDIA_DELETE_REQUEST:
      state.isDeleting = true;
      break;

    case MEDIA_DELETE_SUCCESS: {
      const { file, privateUpload } = action.payload;
      const { key, id } = file;
      if (state.privateUpload !== privateUpload) break;
      state.files = (state.files ?? []).filter(f => (key ? f.key !== key : f.id !== id));
      delete state.displayURLs[id];
      state.isDeleting = false;
      break;
    }

    case MEDIA_DELETE_FAILURE:
      if (state.privateUpload !== action.payload.privateUpload) break;
      state.isDeleting = false;
      break;

    case MEDIA_DISPLAY_URL_REQUEST:
      state.displayURLs[action.payload.key] = { isFetching: true };
      break;

    case MEDIA_DISPLAY_URL_SUCCESS:
      state.displayURLs[action.payload.key] = { isFetching: false, url: action.payload.url };
      break;

    case MEDIA_DISPLAY_URL_FAILURE:
      state.displayURLs[action.payload.key] = {
        isFetching: false,
        err: action.payload.err || true,
      } as DisplayURLState;
      break;
  }
}, defaultState);

export function selectMediaFiles(state: State, field?: CmsEntryField) {
  const { mediaLibrary, entryDraft } = state;
  const editingDraft = selectEditingDraft(state.entryDraft);
  const integration = selectIntegrationDirect(state.integrations, null, 'assetStore');

  let files: CmsMediaFile[];
  // Only fall back to the entry's draft media files when the library was
  // opened for a specific field on that draft. The global media library
  // (no field) must always reflect the persisted store, otherwise draft
  // uploads from a leftover entryDraft state leak into it.
  if (editingDraft && field && !integration) {
    const entryFiles = (entryDraft.entry?.mediaFiles ?? []) as CmsMediaFile[];
    const entry = entryDraft.entry;
    const collection = entry?.collection ? state.collections[entry.collection] : undefined;
    const mediaFolder = selectMediaFolder(state.config, collection ?? null, entry, field);
    files = entryFiles
      .filter(f => dirname(f.path) === mediaFolder)
      .map(file => ({ key: file.id, ...file }));
  } else {
    files = mediaLibrary.files ?? [];
  }

  return files;
}

export function selectMediaFileByPath(state: State, path: string) {
  const files = selectMediaFiles(state);
  return files.find(file => file.path === path);
}

export function selectMediaDisplayURL(state: State, id: string): DisplayURLState {
  return state.mediaLibrary.displayURLs[id] ?? { isFetching: false };
}

export default mediaLibrary;
