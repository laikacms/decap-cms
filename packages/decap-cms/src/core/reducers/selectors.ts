/**
 * Cross-slice selectors (root-state signatures over slice selectors).
 *
 * These live outside `./index` on purpose: action modules need them, and the
 * reducer slices import action-type constants back from those action modules.
 * If actions imported the `./index` barrel, the reducer map there could be
 * evaluated mid-cycle (dropping slices from `combineReducers`) depending on
 * nothing more than import order. This module only touches slice modules, so
 * the cycle never re-enters the barrel.
 */
import * as fromDeploys from './deploys';
import * as fromEditorialWorkflow from './editorialWorkflow';
import * as fromEntries from './entries';
import * as fromIntegrations from './integrations';

import type { Status } from '@/core/constants/publishModes';
import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';

type State = any;
type Collection = CmsCollectionState;
type Entry = CmsEntry;

export function selectEntry(state: State, collection: string, slug: string) {
  return fromEntries.selectEntry(state.entries, collection, slug);
}

export function selectEntries(state: State, collection: Collection) {
  return fromEntries.selectEntries(state.entries, collection);
}

export function selectPublishedSlugs(state: State, collection: string) {
  return fromEntries.selectPublishedSlugs(state.entries, collection);
}

export function selectSearchedEntries(state: State, availableCollections: string[]): Entry[] {
  return state.search.entryIds
    .filter(
      (entryId: { collection: string, slug: string }) => availableCollections.indexOf(entryId.collection) !== -1,
    )
    .map((entryId: { collection: string, slug: string }) =>
      fromEntries.selectEntry(state.entries, entryId.collection, entryId.slug)
    )
    .filter((entry: Entry | undefined): entry is Entry => entry !== undefined);
}

export function selectDeployPreview(state: State, collection: string, slug: string) {
  return fromDeploys.selectDeployPreview(state.deploys, collection, slug);
}

export function selectUnpublishedEntry(state: State, collection: string, slug: string) {
  return fromEditorialWorkflow.selectUnpublishedEntry(state.editorialWorkflow, collection, slug);
}

export function selectUnpublishedEntriesByStatus(state: State, status: Status) {
  return fromEditorialWorkflow.selectUnpublishedEntriesByStatus(state.editorialWorkflow, status);
}

export function selectUnpublishedEntriesGroupedByStatus(state: State) {
  return fromEditorialWorkflow.selectUnpublishedEntriesGroupedByStatus(state.editorialWorkflow);
}

export function selectUnpublishedSlugs(state: State, collection: string) {
  return fromEditorialWorkflow.selectUnpublishedSlugs(state.editorialWorkflow, collection);
}

export function selectIntegration(state: State, collection: string | null, hook: string) {
  return fromIntegrations.selectIntegration(state.integrations, collection, hook);
}
