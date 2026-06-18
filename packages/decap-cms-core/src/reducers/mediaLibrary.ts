import { v4 as uuid } from 'uuid';
import { dirname } from 'path';

import {
  MEDIA_LIBRARY_OPEN,
  MEDIA_LIBRARY_CLOSE,
  MEDIA_LIBRARY_CREATE,
  MEDIA_INSERT,
  MEDIA_REMOVE_INSERTED,
  MEDIA_LOAD_REQUEST,
  MEDIA_LOAD_SUCCESS,
  MEDIA_LOAD_FAILURE,
  MEDIA_PERSIST_REQUEST,
  MEDIA_PERSIST_SUCCESS,
  MEDIA_PERSIST_FAILURE,
  MEDIA_DELETE_REQUEST,
  MEDIA_DELETE_SUCCESS,
  MEDIA_DELETE_FAILURE,
  MEDIA_DISPLAY_URL_REQUEST,
  MEDIA_DISPLAY_URL_SUCCESS,
  MEDIA_DISPLAY_URL_FAILURE,
} from '../actions/mediaLibrary';
import { selectEditingDraft, selectMediaFolder } from './entries';
import { selectIntegration } from './';

import type { MediaLibraryAction } from '../actions/mediaLibrary';
import type {
  State,
  MediaLibraryInstance,
  MediaFile,
  DisplayURLState,
  EntryField,
} from '../types/redux';

type MediaLibraryState = {
  isVisible: boolean;
  showMediaButton: boolean;
  controlMedia: Record<string, string | string[]>;
  displayURLs: Record<string, DisplayURLState>;
  externalLibrary?: MediaLibraryInstance;
  controlID?: string;
  page?: number;
  files?: MediaFile[];
  config: Record<string, unknown>;
  field?: EntryField;
  value?: string | string[];
  replaceIndex?: number | boolean;
  [key: string]: unknown;
};

const defaultState: MediaLibraryState = {
  isVisible: false,
  showMediaButton: true,
  controlMedia: {},
  displayURLs: {},
  config: {},
};

function mediaLibrary(state: MediaLibraryState = defaultState, action: MediaLibraryAction): MediaLibraryState {
  switch (action.type) {
    case MEDIA_LIBRARY_CREATE:
      return {
        ...state,
        externalLibrary: action.payload,
        showMediaButton: action.payload.enableStandalone(),
      };

    case MEDIA_LIBRARY_OPEN: {
      const { controlID, forImage, privateUpload, config, field, value, replaceIndex } =
        action.payload;
      const libConfig = config || {};
      const privateUploadChanged = state.privateUpload !== privateUpload;
      if (privateUploadChanged) {
        return {
          isVisible: true,
          forImage,
          controlID,
          canInsert: !!controlID,
          privateUpload,
          config: libConfig,
          controlMedia: {},
          displayURLs: {},
          showMediaButton: state.showMediaButton,
          field,
          value,
          replaceIndex,
        };
      }
      return {
        ...state,
        isVisible: true,
        forImage: forImage ?? false,
        controlID: controlID ?? '',
        canInsert: !!controlID,
        privateUpload,
        config: libConfig,
        field: field ?? undefined,
        value: value === '' && (libConfig as Record<string, unknown>).multiple ? [] : value ?? '',
        replaceIndex: replaceIndex ?? false,
      };
    }

    case MEDIA_LIBRARY_CLOSE:
      return { ...state, isVisible: false };

    case MEDIA_INSERT: {
      const { mediaPath } = action.payload;
      const controlID = state.controlID ?? '';
      const value = state.value;

      if (!Array.isArray(value)) {
        return {
          ...state,
          controlMedia: {
            ...state.controlMedia,
            [controlID]: mediaPath,
          },
        };
      }

      const replaceIndex = state.replaceIndex;
      const mediaArray = Array.isArray(mediaPath) ? mediaPath : [mediaPath];
      const valueArray = [...(value as string[])];
      if (typeof replaceIndex == 'number') {
        valueArray[replaceIndex] = mediaArray[0];
      } else {
        valueArray.push(...mediaArray);
      }

      return {
        ...state,
        controlMedia: {
          ...state.controlMedia,
          [controlID]: valueArray,
        },
      };
    }

    case MEDIA_REMOVE_INSERTED: {
      const controlID = action.payload.controlID;
      return {
        ...state,
        controlMedia: {
          ...state.controlMedia,
          [controlID]: '',
        },
      };
    }

    case MEDIA_LOAD_REQUEST:
      return {
        ...state,
        isLoading: true,
        isPaginating: action.payload.page > 1,
      };

    case MEDIA_LOAD_SUCCESS: {
      const {
        files = [],
        page,
        canPaginate,
        dynamicSearch,
        dynamicSearchQuery,
        privateUpload,
      } = action.payload;
      const privateUploadChanged = state.privateUpload !== privateUpload;

      if (privateUploadChanged) {
        return state;
      }

      const filesWithKeys = files.map(file => ({ ...file, key: uuid() }));
      const existingFiles = state.files ?? [];
      return {
        ...state,
        isLoading: false,
        isPaginating: false,
        page: page ?? 1,
        hasNextPage: !!(canPaginate && files.length > 0),
        dynamicSearch: dynamicSearch ?? false,
        dynamicSearchQuery: dynamicSearchQuery ?? '',
        dynamicSearchActive: !!dynamicSearchQuery,
        files: page && page > 1 ? [...existingFiles, ...filesWithKeys] : filesWithKeys,
      };
    }

    case MEDIA_LOAD_FAILURE: {
      const privateUploadChanged = state.privateUpload !== action.payload.privateUpload;
      if (privateUploadChanged) {
        return state;
      }
      return { ...state, isLoading: false };
    }

    case MEDIA_PERSIST_REQUEST:
      return { ...state, isPersisting: true };

    case MEDIA_PERSIST_SUCCESS: {
      const { file, privateUpload } = action.payload;
      const privateUploadChanged = state.privateUpload !== privateUpload;
      if (privateUploadChanged) {
        return state;
      }
      const fileWithKey = { ...file, key: uuid() };
      const files = state.files ?? [];
      return {
        ...state,
        files: [fileWithKey, ...files],
        isPersisting: false,
      };
    }

    case MEDIA_PERSIST_FAILURE: {
      const privateUploadChanged = state.privateUpload !== action.payload.privateUpload;
      if (privateUploadChanged) {
        return state;
      }
      return { ...state, isPersisting: false };
    }

    case MEDIA_DELETE_REQUEST:
      return { ...state, isDeleting: true };

    case MEDIA_DELETE_SUCCESS: {
      const { file, privateUpload } = action.payload;
      const { key, id } = file;
      const privateUploadChanged = state.privateUpload !== privateUpload;
      if (privateUploadChanged) {
        return state;
      }
      const files = state.files ?? [];
      const updatedFiles = files.filter(file => (key ? file.key !== key : file.id !== id));
      const { [id]: _, ...displayURLs } = state.displayURLs ?? {};
      return {
        ...state,
        files: updatedFiles,
        displayURLs,
        isDeleting: false,
      };
    }

    case MEDIA_DELETE_FAILURE: {
      const privateUploadChanged = state.privateUpload !== action.payload.privateUpload;
      if (privateUploadChanged) {
        return state;
      }
      return { ...state, isDeleting: false };
    }

    case MEDIA_DISPLAY_URL_REQUEST:
      return {
        ...state,
        displayURLs: {
          ...state.displayURLs,
          [action.payload.key]: {
            ...state.displayURLs?.[action.payload.key],
            isFetching: true,
          },
        },
      };

    case MEDIA_DISPLAY_URL_SUCCESS: {
      const key = action.payload.key;
      return {
        ...state,
        displayURLs: {
          ...state.displayURLs,
          [key]: {
            ...state.displayURLs?.[key],
            isFetching: false,
            url: action.payload.url,
          },
        },
      };
    }

    case MEDIA_DISPLAY_URL_FAILURE: {
      const key = action.payload.key;
      const { url: _url, ...existingEntry } = state.displayURLs?.[key] ?? { isFetching: false };
      return {
        ...state,
        displayURLs: {
          ...state.displayURLs,
          [key]: {
            ...existingEntry,
            isFetching: false,
            err: action.payload.err || true,
          },
        },
      };
    }

    default:
      return state;
  }
}

export function selectMediaFiles(state: State, field?: EntryField) {
  const { mediaLibrary, entryDraft } = state;
  const editingDraft = selectEditingDraft(state.entryDraft);
  const integration = selectIntegration(state, null, 'assetStore');

  let files;
  if (editingDraft && !integration) {
    const entryFiles = (entryDraft.entry?.mediaFiles ?? []) as MediaFile[];
    const entry = entryDraft.entry;
    const collection = entry?.collection ? state.collections[entry.collection] : undefined;
    const mediaFolder = selectMediaFolder(state.config, collection ?? null, entry, field);
    files = entryFiles
      .filter(f => dirname(f.path) === mediaFolder)
      .map(file => ({ key: file.id, ...file }));
  } else {
    files = (mediaLibrary as unknown as MediaLibraryState).files || [];
  }

  return files;
}

export function selectMediaFileByPath(state: State, path: string) {
  const files = selectMediaFiles(state);
  const file = files.find(file => file.path === path);
  return file;
}

export function selectMediaDisplayURL(state: State, id: string) {
  const displayUrlState = (state.mediaLibrary as unknown as MediaLibraryState).displayURLs?.[id] ?? {} as DisplayURLState;
  return displayUrlState;
}

export default mediaLibrary;
