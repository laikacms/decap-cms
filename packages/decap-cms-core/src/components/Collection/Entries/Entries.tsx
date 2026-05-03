import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { Loader, lengths } from 'decap-cms-ui-default';

import EntryListing from './EntryListing';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { Cursor } from 'decap-cms-lib-util';
import type { CmsCollectionState, CmsEntry } from 'decap-cms-lib-util';


const PaginationMessage = styled.div`
  width: ${lengths.topCardWidth};
  padding: 16px;
  text-align: center;
`;

const NoEntriesMessage = styled(PaginationMessage)`
  margin-top: 16px;
`;

interface EntriesProps {
  collections: CmsCollectionState;
  entries?: CmsEntry[];
  page?: number;
  isFetching?: boolean;
  viewStyle?: string;
  cursor: Cursor;
  handleCursorActions: (action: string) => void;
  t: TranslateFunction;
  getWorkflowStatus?: (collectionName: string, slug: string) => string | null;
  getUnpublishedEntries?: (collectionName: string) => CmsEntry[];
  filterTerm?: string;
}

function Entries({
  collections,
  entries,
  isFetching,
  viewStyle,
  cursor,
  handleCursorActions,
  t,
  page,
  getWorkflowStatus,
  getUnpublishedEntries,
  filterTerm,
}: EntriesProps) {
  const loadingMessages = [
    t('collection.entries.loadingEntries'),
    t('collection.entries.cachingEntries'),
    t('collection.entries.longerLoading'),
  ];

  if (isFetching && page === undefined) {
    return <Loader active>{loadingMessages}</Loader>;
  }

  const hasEntries = (entries && entries.length > 0) || cursor?.actions?.has('append_next');
  if (hasEntries) {
    return (
      <>
        <EntryListing
          collections={collections}
          entries={entries}
          viewStyle={viewStyle}
          cursor={cursor}
          handleCursorActions={handleCursorActions}
          page={page}
          getWorkflowStatus={getWorkflowStatus}
          getUnpublishedEntries={getUnpublishedEntries}
          filterTerm={filterTerm}
        />
        {isFetching && page !== undefined && entries && entries.length > 0 ? (
          <PaginationMessage>{t('collection.entries.loadingEntries')}</PaginationMessage>
        ) : null}
      </>
    );
  }

  return <NoEntriesMessage>{t('collection.entries.noEntries')}</NoEntriesMessage>;
}

export default translate()(Entries);
