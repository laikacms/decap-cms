/**
 * This module is currently concerned only with external media libraries
 * registered via `registerMediaLibrary`.
 */
import once from 'lodash/once';

import { getMediaLibrary } from './lib/registry';
import { store } from './redux';
import { configFailed } from './actions/config';
import { createMediaLibrary, insertMedia } from './actions/mediaLibrary';
import { resolveCredentialRefs } from './lib/resolveCredentialRefs';

import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { MediaLibraryInstance, State } from './types/redux';

type MediaLibraryOptions = {};

interface MediaLibrary {
  init: (args: {
    options: MediaLibraryOptions;
    handleInsert: (url: string) => void;
  }) => MediaLibraryInstance;
}

function handleInsert(url: string) {
  return (store.dispatch as ThunkDispatch<State, {}, AnyAction>)(insertMedia(url, undefined));
}

const initializeMediaLibrary = once(async function initializeMediaLibrary(name, options) {
  const lib = getMediaLibrary(name) as unknown as MediaLibrary | undefined;
  if (!lib) {
    const err = new Error(
      `Missing external media library '${name}'. Please use 'registerMediaLibrary' to register it.`,
    );
    store.dispatch(configFailed(err));
  } else {
    // Resolve any `{ credential: 'name' }` references (e.g. an API key kept
    // out of the public config.yml) before handing the config to the
    // integration, so provider packages never need to know about the
    // credential store themselves.
    const resolvedOptions = await resolveCredentialRefs(
      store.dispatch as ThunkDispatch<State, {}, AnyAction>,
      options,
    );
    const instance = await lib.init({ options: resolvedOptions, handleInsert });
    store.dispatch(createMediaLibrary(instance));
  }
});

store.subscribe(() => {
  const state = store.getState();
  if (state) {
    const mediaLibraryName = state.config.media_library?.name;
    if (mediaLibraryName && !state.mediaLibrary.get('externalLibrary')) {
      const mediaLibraryConfig = state.config.media_library;
      initializeMediaLibrary(mediaLibraryName, mediaLibraryConfig);
    }
  }
});
