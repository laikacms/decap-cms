import startsWith from 'lodash/startsWith';
import { createSelector } from '@reduxjs/toolkit';

import { EDITORIAL_WORKFLOW, status as statusValues } from '../constants/publishModes';
import {
  UNPUBLISHED_ENTRY_REQUEST,
  UNPUBLISHED_ENTRY_REDIRECT,
  UNPUBLISHED_ENTRY_SUCCESS,
  UNPUBLISHED_ENTRIES_REQUEST,
  UNPUBLISHED_ENTRIES_SUCCESS,
  UNPUBLISHED_ENTRY_PERSIST_REQUEST,
  UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
  UNPUBLISHED_ENTRY_PERSIST_FAILURE,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE,
  UNPUBLISHED_ENTRY_PUBLISH_REQUEST,
  UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
  UNPUBLISHED_ENTRY_PUBLISH_FAILURE,
  UNPUBLISHED_ENTRY_DELETE_SUCCESS,
} from '../actions/editorialWorkflow';
import { CONFIG_SUCCESS } from '../actions/config';

import type {
  EditorialWorkflowAction,
  EditorialWorkflow,
  Entities,
  EntryMap,
} from '../types/redux';

const defaultState: EditorialWorkflow = { entities: {}, pages: {} };

function unpublishedEntries(
  state: EditorialWorkflow = defaultState as unknown as EditorialWorkflow,
  action: EditorialWorkflowAction,
): EditorialWorkflow {
  switch (action.type) {
    case CONFIG_SUCCESS: {
      const publishMode = action.payload && action.payload.publish_mode;
      if (publishMode === EDITORIAL_WORKFLOW) {
        //  Editorial workflow state is explicitly initiated after the config.
        return { entities: {}, pages: {} };
      }
      return state;
    }

    case UNPUBLISHED_ENTRY_REQUEST: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: { ...state.entities?.[key], isFetching: true } as EntryMap,
        },
      };
    }

    case UNPUBLISHED_ENTRY_REDIRECT: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      const { [key]: _, ...entities } = state.entities ?? {};
      return { ...state, entities };
    }

    case UNPUBLISHED_ENTRY_SUCCESS: {
      const key = `${action.payload!.collection}.${action.payload!.entry.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: action.payload!.entry as unknown as EntryMap,
        },
      };
    }

    case UNPUBLISHED_ENTRIES_REQUEST:
      return {
        ...state,
        pages: { ...state.pages, isFetching: true } as unknown as typeof state.pages,
      };

    case UNPUBLISHED_ENTRIES_SUCCESS: {
      const newEntities = { ...state.entities };
      action.payload!.entries.forEach(entry => {
        newEntities[`${entry.collection}.${entry.slug}`] = {
          ...entry,
          isFetching: false,
        } as unknown as EntryMap;
      });
      return {
        ...state,
        entities: newEntities,
        pages: {
          ...action.payload!.pages,
          ids: action.payload!.entries.map(entry => entry.slug),
        } as unknown as typeof state.pages,
      };
    }

    case UNPUBLISHED_ENTRY_PERSIST_REQUEST: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: { ...state.entities?.[key], isPersisting: true } as EntryMap,
        },
      };
    }

    case UNPUBLISHED_ENTRY_PERSIST_SUCCESS: {
      // Update Optimistically
      const entrySlug = action.payload!.entry.slug;
      const key = `${action.payload!.collection}.${entrySlug}`;
      const { isPersisting: _, ...entryWithoutPersisting } = (state.entities?.[key] ??
        {}) as EntryMap & { isPersisting?: boolean };
      const ids = (state.pages as unknown as { ids?: string[] })?.ids ?? [];
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: { ...(action.payload!.entry as unknown as EntryMap), ...entryWithoutPersisting },
        },
        pages: {
          ...state.pages,
          ids: ids.includes(entrySlug) ? ids : [...ids, entrySlug],
        } as unknown as typeof state.pages,
      };
    }

    case UNPUBLISHED_ENTRY_PERSIST_FAILURE: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: { ...state.entities?.[key], isPersisting: false } as EntryMap,
        },
      };
    }

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST: {
      // Update Optimistically
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: { ...state.entities?.[key], isUpdatingStatus: true } as EntryMap,
        },
      };
    }

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: {
            ...state.entities?.[key],
            status: action.payload!.newStatus,
            isUpdatingStatus: false,
          } as EntryMap,
        },
      };
    }

    case UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: { ...state.entities?.[key], isUpdatingStatus: false } as EntryMap,
        },
      };
    }

    case UNPUBLISHED_ENTRY_PUBLISH_REQUEST: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      return {
        ...state,
        entities: {
          ...state.entities,
          [key]: { ...state.entities?.[key], isPublishing: true } as EntryMap,
        },
      };
    }

    case UNPUBLISHED_ENTRY_PUBLISH_SUCCESS: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      const { [key]: _, ...entities } = state.entities ?? {};
      return { ...state, entities };
    }

    case UNPUBLISHED_ENTRY_DELETE_SUCCESS: {
      const key = `${action.payload!.collection}.${action.payload!.slug}`;
      const { [key]: _, ...entities } = state.entities ?? {};
      return { ...state, entities };
    }

    case UNPUBLISHED_ENTRY_PUBLISH_FAILURE:
    default:
      return state;
  }
}

export function selectUnpublishedEntry(state: EditorialWorkflow, collection: string, slug: string) {
  return state && state.entities?.[`${collection}.${slug}`];
}

// Per-status selector factory: one memoized selector per status value,
// so each call site gets a stable reference when entities haven't changed.
const _selectorsByStatus: Record<string, ReturnType<typeof createSelector>> = {};

function getSelectorForStatus(targetStatus: string) {
  if (!_selectorsByStatus[targetStatus]) {
    _selectorsByStatus[targetStatus] = createSelector(
      (state: EditorialWorkflow) => (state ? state.entities : null),
      (entities: Entities | null) => {
        if (!entities) return null;
        return Object.values(entities).filter(
          entry => (entry as EntryMap & { status?: string }).status === targetStatus,
        );
      },
    );
  }
  return _selectorsByStatus[targetStatus];
}

export function selectUnpublishedEntriesByStatus(state: EditorialWorkflow, status: string) {
  return getSelectorForStatus(status)(state) as EntryMap[] | null;
}

// Single memoized selector that groups all unpublished entries by status.
// Returns a stable object reference when entities haven't changed.
export const selectUnpublishedEntriesGroupedByStatus = createSelector(
  (state: EditorialWorkflow) => (state ? state.entities : null),
  (entities: Entities | null) => {
    const grouped: Record<string, EntryMap[] | null> = {};
    Object.values(statusValues).forEach(currStatus => {
      if (currStatus) {
        grouped[currStatus] = entities
          ? Object.values(entities).filter(
              entry => (entry as EntryMap & { status?: string }).status === currStatus,
            )
          : null;
      }
    });
    return grouped;
  },
);

export function selectUnpublishedSlugs(state: EditorialWorkflow, collection: string) {
  if (!state.entities) return null;
  const entities = state.entities;
  return Object.entries(entities)
    .filter(([k]) => startsWith(k, `${collection}.`))
    .map(([_, v]) => (v as EntryMap).slug);
}

export default unpublishedEntries;
