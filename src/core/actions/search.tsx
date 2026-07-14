import isEqual from 'lodash/isEqual';

import { currentBackend } from '@/core/backend';
import { getIntegrationProvider } from '@/core/integrations';
import { selectIntegration } from '@/core/reducers';

import type { QueryRequest } from '@/core/reducers/search';
import type { CmsCollectionState } from '@/lib/util/index';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { EntryValue } from '@/core/valueObjects/Entry';

type State = any;
type Collection = CmsCollectionState;

/*
 * Constant Declarations
 */
export const SEARCH_ENTRIES_REQUEST = 'SEARCH_ENTRIES_REQUEST';
export const SEARCH_ENTRIES_SUCCESS = 'SEARCH_ENTRIES_SUCCESS';
export const SEARCH_ENTRIES_FAILURE = 'SEARCH_ENTRIES_FAILURE';

export const QUERY_REQUEST = 'QUERY_REQUEST';
export const QUERY_SUCCESS = 'QUERY_SUCCESS';
export const QUERY_FAILURE = 'QUERY_FAILURE';

export const SEARCH_CLEAR = 'SEARCH_CLEAR';
export const CLEAR_REQUESTS = 'CLEAR_REQUESTS';

/*
 * Simple Action Creators (Internal)
 * We still need to export them for tests
 */
export function searchingEntries(searchTerm: string, searchCollections: string[], page: number) {
  return {
    type: SEARCH_ENTRIES_REQUEST,
    payload: { searchTerm, searchCollections, page },
  } as const;
}

export function searchSuccess(entries: EntryValue[], page: number) {
  return {
    type: SEARCH_ENTRIES_SUCCESS,
    payload: {
      entries,
      page,
    },
  } as const;
}

export function searchFailure(error: Error) {
  return {
    type: SEARCH_ENTRIES_FAILURE,
    payload: { error },
  } as const;
}

export function querying(searchTerm: string, request?: QueryRequest) {
  return {
    type: QUERY_REQUEST,
    payload: {
      searchTerm,
      request,
    },
  } as const;
}

type SearchResponse = {
  entries: EntryValue[];
  pagination: number;
};

type QueryResponse = {
  hits: EntryValue[];
  query: string;
};

export function querySuccess(namespace: string, hits: EntryValue[]) {
  return {
    type: QUERY_SUCCESS,
    payload: {
      namespace,
      hits,
    },
  } as const;
}

export function queryFailure(error: Error) {
  return {
    type: QUERY_FAILURE,
    payload: { error },
  } as const;
}

/*
 * Exported simple Action Creators
 */

export function clearSearch() {
  return { type: SEARCH_CLEAR } as const;
}

export function clearRequests() {
  return { type: CLEAR_REQUESTS } as const;
}

/*
 * Exported Thunk Action Creators
 */

// SearchEntries will search for complete entries in all collections.
export function searchEntries(searchTerm: string, searchCollections: string[], page = 0) {
  return async (dispatch: ThunkDispatch<State, undefined, AnyAction>, getState: () => State) => {
    const state = getState();
    const { search } = state;
    const backend = currentBackend(state.config);
    const allCollections = searchCollections || Object.keys(state.collections);
    const collections = allCollections.filter(collection =>
      selectIntegration(state, collection, 'search'),
    );
    const integration = selectIntegration(state, collections[0], 'search');

    // avoid duplicate searches
    if (
      search.isFetching &&
      search.term === searchTerm &&
      isEqual(allCollections, search.collections) &&
      // if an integration doesn't exist, 'page' is not used
      (search.page === page || !integration)
    ) {
      return;
    }

    dispatch(searchingEntries(searchTerm, allCollections, page));

    const integrationProvider: any = integration
      ? getIntegrationProvider(state.integrations, backend.getToken as any, integration)
      : null;
    const searchPromise = integrationProvider
      ? integrationProvider.search(collections, searchTerm, page)
      : backend.search(
          Object.entries(state.collections)
            .filter(([key]) => allCollections.indexOf(key) !== -1)
            .map(([, collection]) => collection) as Collection[],
          searchTerm,
        );

    try {
      const response: SearchResponse = await searchPromise;
      return dispatch(searchSuccess(response.entries, response.pagination));
    } catch (error: unknown) {
      return dispatch(searchFailure(error instanceof Error ? error : new Error(String(error))));
    }
  };
}

// Instead of searching for complete entries, query will search for specific fields
// in specific collections and return raw data (no entries).
export function query(
  namespace: string,
  collectionName: string,
  searchFields: string[],
  searchTerm: string,
  file?: string,
  limit?: number,
) {
  return async (dispatch: ThunkDispatch<State, {}, AnyAction>, getState: () => State) => {
    const state = getState();
    const backend = currentBackend(state.config);
    const integration = selectIntegration(state, collectionName, 'search');
    const collection = state.collections[collectionName];

    dispatch(clearRequests());

    const queryIdentifier = `${collectionName}-${searchFields.join()}-${searchTerm}-${file}-${limit}`;

    const queuedQueryPromise = state.search.requests.find(
      ({ id }: QueryRequest) => id == queryIdentifier,
    );

    const integrationProvider: any = integration
      ? getIntegrationProvider(state.integrations, backend.getToken as any, integration)
      : null;
    const queryPromise = queuedQueryPromise
      ? queuedQueryPromise.queryResponse
      : integrationProvider
        ? integrationProvider.searchBy(
            searchFields.map(f => `data.${f}`),
            collectionName,
            searchTerm,
          )
        : collection != null
          ? backend.query(collection, searchFields, searchTerm, file, limit)
          : Promise.resolve({ hits: [], query: '' } satisfies QueryResponse);

    dispatch(
      querying(
        searchTerm,
        queuedQueryPromise
          ? undefined
          : {
              id: queryIdentifier,
              expires: new Date(new Date().getTime() + 10 * 1000),
              queryResponse: queryPromise,
            },
      ),
    );

    try {
      const response: QueryResponse = await queryPromise;
      return dispatch(querySuccess(namespace, response.hits));
    } catch (error: unknown) {
      return dispatch(queryFailure(error instanceof Error ? error : new Error(String(error))));
    }
  };
}

export type SearchAction = ReturnType<
  | typeof searchingEntries
  | typeof searchSuccess
  | typeof searchFailure
  | typeof querying
  | typeof querySuccess
  | typeof queryFailure
  | typeof clearSearch
  | typeof clearRequests
>;
