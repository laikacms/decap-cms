import React from 'react';
import { connect } from 'react-redux';
import { Cursor } from 'decap-cms-lib-util';


import { selectSearchedEntries, selectUnpublishedEntry } from '../../../reducers';
import {
  searchEntries as actionSearchEntries,
  clearSearch as actionClearSearch,
} from '../../../actions/search';
import Entries from './Entries';

import type { CmsCollectionState, CmsCollections, CmsEntry } from 'decap-cms-lib-util';

interface EntriesSearchProps {
  isFetching?: boolean;
  searchEntries: (searchTerm: string, collectionNames: string[], page?: number) => void;
  clearSearch: () => void;
  searchTerm: string;
  collections?: CmsCollectionState[];
  collectionNames?: string[];
  entries?: CmsEntry[];
  page?: number;
  getWorkflowStatus?: (collectionName: string, slug: string) => string | null;
}

function EntriesSearch({
  isFetching,
  searchEntries,
  clearSearch,
  searchTerm,
  collections,
  collectionNames,
  entries,
  page,
  getWorkflowStatus,
}: EntriesSearchProps) {
  const searchEntriesRef = React.useRef(searchEntries);
  searchEntriesRef.current = searchEntries;
  const clearSearchRef = React.useRef(clearSearch);
  clearSearchRef.current = clearSearch;

  const collectionNamesKey = JSON.stringify(collectionNames || []);

  React.useEffect(() => {
    searchEntriesRef.current(searchTerm, collectionNames || []);
    // collectionNamesKey is included so re-search occurs when names change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, collectionNamesKey]);

  React.useEffect(() => {
    return () => {
      clearSearchRef.current();
    };
  }, []);

  function handleCursorActions(action: string) {
    if (action === 'append_next') {
      const nextPage = (page || 0) + 1;
      searchEntries(searchTerm, collectionNames || [], nextPage);
    }
  }

  const cursor = Cursor.create({
    actions: isNaN(page as number) ? [] : ['append_next'],
  });

  return (
    <Entries
      cursor={cursor}
      handleCursorActions={handleCursorActions}
      collections={collections as any}
      entries={entries}
      isFetching={isFetching}
      getWorkflowStatus={getWorkflowStatus}
    />
  );
}

function mapStateToProps(
  state: any,
  ownProps: { collections: CmsCollections; searchTerm: string },
) {
  const { searchTerm } = ownProps;
  const collections = Object.values(ownProps.collections);
  const collectionNames = Object.keys(ownProps.collections);
  const isFetching = state.search.isFetching;
  const page = state.search.page;
  const entries = selectSearchedEntries(state, collectionNames);

  function getWorkflowStatus(collectionName: string, slug: string) {
    const unpublishedEntry = selectUnpublishedEntry(state, collectionName, slug);
    return unpublishedEntry ? (unpublishedEntry as any).status : null;
  }

  return { isFetching, page, collections, collectionNames, entries, searchTerm, getWorkflowStatus };
}

const mapDispatchToProps = {
  searchEntries: actionSearchEntries,
  clearSearch: actionClearSearch,
};

export default connect(mapStateToProps, mapDispatchToProps)(EntriesSearch);
