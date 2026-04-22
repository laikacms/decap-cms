import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { useTranslate } from 'react-polyglot';
import { lengths, components } from 'decap-cms-ui-default';

import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { getNewEntryUrl } from '../../lib/urlHelper';
import Sidebar from './Sidebar';
import CollectionTop from './CollectionTop';
import EntriesCollection from './Entries/EntriesCollection';
import EntriesSearch from './Entries/EntriesSearch';
import CollectionControls from './CollectionControls';
import { sortByField, filterByField, changeViewStyle, groupByField } from '../../actions/entries';
import {
  selectSortableFields,
  selectViewFilters,
  selectViewGroups,
} from '../../reducers/collections';
import {
  selectEntriesSort,
  selectEntriesFilter,
  selectEntriesGroup,
  selectViewStyle,
} from '../../reducers/entries';

import type { Collection as CollectionType, ViewFilter, ViewGroup, SortDirection } from 'decap-cms-lib-util/types/cms-immutable';

const CollectionContainer = styled.div`
  margin: ${lengths.pageMargin};
`;

const CollectionMain = styled.main`
  padding-left: 280px;
`;

const SearchResultContainer = styled.div`
  ${components.cardTop};
  margin-bottom: 22px;
`;

const SearchResultHeading = styled.h1`
  ${components.cardTopHeading};
`;

interface CollectionProps {
  match: {
    params: {
      name?: string;
      searchTerm?: string;
      filterTerm?: string;
    };
  };
  isSearchResults?: boolean;
  isSingleSearchResult?: boolean;
}

/**
 * Collection component - converted to functional component with Redux hooks
 * Uses useCallback for handlers and useMemo for computed values
 * NO useEffect - all side effects are handled by Redux actions
 */
function Collection({ match, isSearchResults = false, isSingleSearchResult = false }: CollectionProps) {
  const t = useTranslate();
  const dispatch = useAppDispatch();

  // Extract params from match
  const { name, searchTerm = '', filterTerm = '' } = match.params;

  // Select state from Redux store
  const collections = useAppSelector(state => state.collections);
  const entries = useAppSelector(state => state.entries);
  const isSearchEnabled = useAppSelector(state => state.config?.search !== false);

  // Get the collection
  const collection = useMemo(() => {
    if (name) {
      return collections.get(name);
    }
    // Get first collection
    const keys = Object.keys(collections.toJS ? collections.toJS() : collections);
    return keys.length > 0 ? collections.get(keys[0]) : undefined;
  }, [collections, name]) as CollectionType | undefined;

  const collectionName = collection?.get('name') || name || '';

  // Memoized selectors
  const sort = useMemo(
    () => (collectionName ? selectEntriesSort(entries, collectionName) : undefined),
    [entries, collectionName]
  );

  const sortableFields = useMemo(
    () => (collection ? selectSortableFields(collection, t) : []),
    [collection, t]
  );

  const viewFilters = useMemo(
    () => (collection ? selectViewFilters(collection) : undefined),
    [collection]
  );

  const viewGroups = useMemo(
    () => (collection ? selectViewGroups(collection) : undefined),
    [collection]
  );

  const filter = useMemo(
    () => (collectionName ? selectEntriesFilter(entries, collectionName) : undefined),
    [entries, collectionName]
  );

  const group = useMemo(
    () => (collectionName ? selectEntriesGroup(entries, collectionName) : undefined),
    [entries, collectionName]
  );

  const viewStyle = useMemo(() => selectViewStyle(entries), [entries]);

  // Compute new entry URL
  const newEntryUrl = useMemo(() => {
    if (!collection?.get('create') || !collectionName) {
      return '';
    }
    let url = getNewEntryUrl(collectionName);
    if (filterTerm) {
      url = `${url}?path=${filterTerm}`;
    }
    return url;
  }, [collection, collectionName, filterTerm]);

  // Handlers using useCallback
  const onSortClick = useCallback(
    (key: string, direction: SortDirection) => {
      if (collection) {
        dispatch(sortByField(collection, key, direction));
      }
    },
    [dispatch, collection]
  );

  const onFilterClick = useCallback(
    (filterValue: ViewFilter) => {
      if (collection) {
        dispatch(filterByField(collection, filterValue));
      }
    },
    [dispatch, collection]
  );

  const onGroupClick = useCallback(
    (groupValue: ViewGroup) => {
      if (collection) {
        dispatch(groupByField(collection, groupValue));
      }
    },
    [dispatch, collection]
  );

  const onChangeViewStyle = useCallback(
    (style: string) => {
      dispatch(changeViewStyle(style));
    },
    [dispatch]
  );

  // Render helpers
  const renderEntriesCollection = useCallback(() => {
    if (!collection) return null;
    return (
      <EntriesCollection collection={collection} viewStyle={viewStyle} filterTerm={filterTerm} />
    );
  }, [collection, viewStyle, filterTerm]);

  const renderEntriesSearch = useCallback(() => {
    const searchCollections = isSingleSearchResult && collection
      ? collections.filter((c: CollectionType) => c === collection)
      : collections;
    return (
      <EntriesSearch
        collections={searchCollections}
        searchTerm={searchTerm}
      />
    );
  }, [collections, collection, isSingleSearchResult, searchTerm]);

  // Early return if no collection
  if (!collection) {
    return null;
  }

  const searchResultKey =
    'collection.collectionTop.searchResults' + (isSingleSearchResult ? 'InCollection' : '');

  return (
    <CollectionContainer>
      <Sidebar
        collections={collections}
        collection={(!isSearchResults || isSingleSearchResult) ? collection : undefined}
        isSearchEnabled={isSearchEnabled}
        searchTerm={searchTerm}
        filterTerm={filterTerm}
      />
      <CollectionMain>
        {isSearchResults ? (
          <SearchResultContainer>
            <SearchResultHeading>
              {t(searchResultKey, { searchTerm, collection: collection.get('label') })}
            </SearchResultHeading>
          </SearchResultContainer>
        ) : (
          <>
            <CollectionTop collection={collection} newEntryUrl={newEntryUrl} />
            <CollectionControls
              viewStyle={viewStyle}
              onChangeViewStyle={onChangeViewStyle}
              sortableFields={sortableFields}
              onSortClick={onSortClick}
              sort={sort}
              viewFilters={viewFilters}
              viewGroups={viewGroups}
              t={t}
              onFilterClick={onFilterClick}
              onGroupClick={onGroupClick}
              filter={filter}
              group={group}
            />
          </>
        )}
        {isSearchResults ? renderEntriesSearch() : renderEntriesCollection()}
      </CollectionMain>
    </CollectionContainer>
  );
}

export default Collection;
