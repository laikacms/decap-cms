import { currentBackend } from '../backend';
import { selectDeployPreview } from '../reducers';
import { addNotification } from './notifications';

import type { ThunkDispatch } from 'redux-thunk';
import type { AnyAction } from 'redux';
import type { Collection, Entry, EntryMap, FileEntry, State } from 'decap-cms-lib-util/types/cms-immutable';

export const DEPLOY_PREVIEW_REQUEST = 'DEPLOY_PREVIEW_REQUEST';
export const DEPLOY_PREVIEW_SUCCESS = 'DEPLOY_PREVIEW_SUCCESS';
export const DEPLOY_PREVIEW_FAILURE = 'DEPLOY_PREVIEW_FAILURE';

function deployPreviewLoading(collection: string, slug: string) {
  return {
    type: DEPLOY_PREVIEW_REQUEST,
    payload: {
      collection,
      slug,
    },
  } as const;
}

function deployPreviewLoaded(
  collection: string,
  slug: string,
  deploy: { url: string | undefined; status: string },
) {
  const { url, status } = deploy;
  return {
    type: DEPLOY_PREVIEW_SUCCESS,
    payload: {
      collection,
      slug,
      url,
      status,
    },
  } as const;
}

function deployPreviewError(collection: string, slug: string) {
  return {
    type: DEPLOY_PREVIEW_FAILURE,
    payload: {
      collection,
      slug,
    },
  } as const;
}

/**
 * Requests a deploy preview object from the registered backend.
 */
export function loadDeployPreview(
  collection: Collection,
  slug: string,
  entry: Entry,
  published: boolean,
  opts?: { maxAttempts?: number; interval?: number; signal?: AbortSignal },
) {
  return async (dispatch: ThunkDispatch<State, undefined, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    const collectionName = collection.get('name');

    // Exit if currently fetching, unless the caller provides a signal
    // (indicating it manages cancellation of the previous poll externally).
    const deployState = selectDeployPreview(state, collectionName, slug);
    if (deployState && deployState.isFetching && !opts?.signal) {
      return;
    }

    dispatch(deployPreviewLoading(collectionName, slug));

    try {
      /**
       * `getDeploy` is for published entries, while `getDeployPreview` is for
       * unpublished entries.
       */
      if (entry.toObject().dataFiles) { // TODO: Make properly typesafe (Blocking: Remove immutable.js)
        throw new Error('Deploy previews are not supported for file entries');
      }
      const deploy = published
        ? backend.getDeploy(collection, slug, entry as EntryMap)
        : await backend.getDeployPreview(collection, slug, entry as EntryMap, opts);
      if (deploy) {
        return dispatch(deployPreviewLoaded(collectionName, slug, deploy));
      }
      return dispatch(deployPreviewError(collectionName, slug));
    } catch (error: unknown) {
      console.error(error);
      dispatch(
        addNotification({
          message: {
            details: error instanceof Error ? error.message : String(error),
            key: 'ui.toast.onFailToLoadDeployPreview',
          },
          type: 'error',
          dismissAfter: 8000,
        }),
      );
      dispatch(deployPreviewError(collectionName, slug));
    }
  };
}

export type DeploysAction = ReturnType<
  typeof deployPreviewLoading | typeof deployPreviewLoaded | typeof deployPreviewError
>;
