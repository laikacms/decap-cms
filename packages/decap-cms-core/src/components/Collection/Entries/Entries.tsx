import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { translate } from 'react-polyglot';
import { Loader, lengths, TranslateFunction } from 'decap-cms-ui-default';

import type { List as ImmutableList } from 'immutable';
import type { Cursor } from 'decap-cms-lib-util';
import type { Collection, EntryMap } from '../../../types/cms';

import EntryListing from './EntryListing';

const PaginationMessage = styled.div`
  width: ${lengths.topCardWidth};
  padding: 16px;
  text-align: center;
`;

const NoEntriesMessage = styled(PaginationMessage)`
  margin-top: 16px;
`;

interface EntriesProps {
  collections: Collection;
  entries?: ImmutableList<EntryMap>;
  page?: number;
  isFetching?: boolean;
  viewStyle?: string;
  cursor: Cursor;
  handleCursorActions: (action: string) => void;
  t: TranslateFunction;
  getWorkflowStatus?: (collectionName: string, slug: string) => string | null;
  getUnpublishedEntries?: (collectionName: string) => EntryMap[];
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

  const hasEntries = (entries && entries.size > 0) || cursor?.actions?.has('append_next');
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
        {isFetching && page !== undefined && entries && entries.size > 0 ? (
          <PaginationMessage>{t('collection.entries.loadingEntries')}</PaginationMessage>
        ) : null}
      </>
    );
  }

  return <NoEntriesMessage>{t('collection.entries.noEntries')}</NoEntriesMessage>;
}

Entries.propTypes = {
  collections: ImmutablePropTypes.iterable.isRequired,
  entries: ImmutablePropTypes.list,
  page: PropTypes.number,
  isFetching: PropTypes.bool,
  viewStyle: PropTypes.string,
  cursor: PropTypes.any.isRequired,
  handleCursorActions: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  getWorkflowStatus: PropTypes.func,
  getUnpublishedEntries: PropTypes.func,
  filterTerm: PropTypes.string,
};

export default translate()(Entries);
