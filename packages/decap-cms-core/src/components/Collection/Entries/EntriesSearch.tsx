import React from 'react';
import { Cursor } from 'decap-cms-lib-util';

import { selectSearchedEntries, selectUnpublishedEntry } from '../../../reducers';
import {
  searchEntries as actionSearchEntries,
  clearSearch as actionClearSearch,
} from '../../../actions/search';
import Entries from './Entries';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import type { CmsCollections } from 'decap-cms-lib-util';

interface EntriesSearchProps {
  collections: CmsCollections;
  searchTerm: string;
}

export default function EntriesSearch({ collections, searchTerm }: EntriesSearchProps) {
  const dispatch = useAppDispatch();
  const collectionValues = React.useMemo(() => Object.values(collections), [collections]);
  const collectionNames = React.useMemo(() => Object.keys(collections), [collections]);
  const collectionNamesKey = React.useMemo(
    () => JSON.stringify(collectionNames),
    [collectionNames],
  );

  const isFetching = useAppSelector((state: any) => state.search.isFetching);
  const page = useAppSelector((state: any) => state.search.page);
  const entries = useAppSelector((state: any) => selectSearchedEntries(state, collectionNames));

  const getWorkflowStatus = useAppSelector(
    (state: any) => (collectionName: string, slug: string) => {
      const unpublishedEntry = selectUnpublishedEntry(state, collectionName, slug);
      return unpublishedEntry ? (unpublishedEntry as any).status : null;
    },
  );

  React.useEffect(() => {
    dispatch(actionSearchEntries(searchTerm, JSON.parse(collectionNamesKey)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror prior behavior
  }, [searchTerm, collectionNamesKey]);

  React.useEffect(() => {
    return () => {
      dispatch(actionClearSearch());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
  }, []);

  function handleCursorActions(action: string) {
    if (action === 'append_next') {
      const nextPage = (page || 0) + 1;
      dispatch(actionSearchEntries(searchTerm, collectionNames, nextPage));
    }
  }

  const cursor = Cursor.create({
    actions: isNaN(page as number) ? [] : ['append_next'],
  });

  return (
    <Entries
      cursor={cursor}
      handleCursorActions={handleCursorActions}
      collections={collectionValues as any}
      entries={entries}
      isFetching={isFetching}
      getWorkflowStatus={getWorkflowStatus}
    />
  );
}
