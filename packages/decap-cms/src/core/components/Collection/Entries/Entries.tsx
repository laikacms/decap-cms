import styled from '@emotion/styled';
import React from 'react';

import { translate } from '@/core/i18n';
import { useCmsSlots } from '@/core/lib/slots';
import { Loader } from '@/ui/default/index';
import EntryListing from './EntryListing';

import type { Cursor } from '@/lib/util/index';
import type { CmsCollectionState, CmsEntry, CmsSortObject } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const PaginationMessage = styled.div`
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
  sortFields?: CmsSortObject[];
  showPublishedEntries?: boolean;
  showUnpublishedEntries?: boolean;
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
  sortFields,
  showPublishedEntries = true,
  showUnpublishedEntries = true,
}: EntriesProps) {
  const { renderLoader } = useCmsSlots();
  const loadingMessages = [
    t('collection.entries.loadingEntries'),
    t('collection.entries.cachingEntries'),
    t('collection.entries.longerLoading'),
  ];

  if (showPublishedEntries && isFetching && page === undefined) {
    return renderLoader
      ? <>{renderLoader({ label: loadingMessages, context: 'entries' })}</>
      : <Loader active>{loadingMessages}</Loader>;
  }

  const hasEntries = showPublishedEntries
    && ((entries && entries.length > 0) || cursor?.actions?.has('append_next'));
  if (hasEntries || !showPublishedEntries) {
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
          sortFields={sortFields}
          showPublishedEntries={showPublishedEntries}
          showUnpublishedEntries={showUnpublishedEntries}
        />
        {showPublishedEntries && isFetching && page !== undefined && entries && entries.length > 0
          ? <PaginationMessage>{t('collection.entries.loadingEntries')}</PaginationMessage>
          : null}
      </>
    );
  }

  return <NoEntriesMessage>{t('collection.entries.noEntries')}</NoEntriesMessage>;
}

export default translate()(Entries);
