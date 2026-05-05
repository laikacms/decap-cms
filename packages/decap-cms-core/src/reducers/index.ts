import auth from './auth';
import config from './config';
import integrations, * as fromIntegrations from './integrations';
import entries, * as fromEntries from './entries';
import cursors from './cursors';
import editorialWorkflow, * as fromEditorialWorkflow from './editorialWorkflow';
import entryDraft from './entryDraft';
import collections from './collections';
import search from './search';
import medias from './medias';
import mediaLibrary from './mediaLibrary';
import deploys, * as fromDeploys from './deploys';
import globalUI from './globalUI';
import status from './status';
import notifications from './notifications';

import type { Status } from '../constants/publishModes';
import type { CmsCollectionState, CmsEntry } from 'decap-cms-lib-util';

const reducers = {
  auth,
  config,
  collections,
  search,
  integrations,
  entries,
  cursors,
  editorialWorkflow,
  entryDraft,
  medias,
  mediaLibrary,
  deploys,
  globalUI,
  status,
  notifications,
};

export default reducers;

/*
 * Selectors
 */
export function selectEntry(state: any, collection: string, slug: string) {
  return fromEntries.selectEntry(state.entries, collection, slug);
}

export function selectEntries(state: any, collection: CmsCollectionState) {
  return fromEntries.selectEntries(state.entries, collection);
}

export function selectPublishedSlugs(state: any, collection: string) {
  return fromEntries.selectPublishedSlugs(state.entries, collection);
}

export function selectSearchedEntries(state: any, availableCollections: string[]): CmsEntry[] {
  return state.search.entryIds
    .filter(
      (entryId: { collection: string; slug: string }) =>
        availableCollections.indexOf(entryId.collection) !== -1,
    )
    .map((entryId: { collection: string; slug: string }) =>
      fromEntries.selectEntry(state.entries, entryId.collection, entryId.slug),
    )
    .filter((entry: CmsEntry | undefined): entry is CmsEntry => entry !== undefined);
}

export function selectDeployPreview(state: any, collection: string, slug: string) {
  return fromDeploys.selectDeployPreview(state.deploys, collection, slug);
}

export function selectUnpublishedEntry(state: any, collection: string, slug: string) {
  return fromEditorialWorkflow.selectUnpublishedEntry(state.editorialWorkflow, collection, slug);
}

export function selectUnpublishedEntriesByStatus(state: any, status: Status) {
  return fromEditorialWorkflow.selectUnpublishedEntriesByStatus(state.editorialWorkflow, status);
}

export function selectUnpublishedSlugs(state: any, collection: string) {
  return fromEditorialWorkflow.selectUnpublishedSlugs(state.editorialWorkflow, collection);
}

export function selectIntegration(state: any, collection: string | null, hook: string) {
  return fromIntegrations.selectIntegration(state.integrations, collection, hook);
}
