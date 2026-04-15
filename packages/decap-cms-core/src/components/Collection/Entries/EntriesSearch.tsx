import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import isEqual from 'lodash/isEqual';
import { Cursor } from 'decap-cms-lib-util';

import type { List as ImmutableList, Seq } from 'immutable';
import type { Collection, EntryMap, State } from '../../../types/cms';

import { selectSearchedEntries, selectUnpublishedEntry } from '../../../reducers';
import {
  searchEntries as actionSearchEntries,
  clearSearch as actionClearSearch,
} from '../../../actions/search';
import Entries from './Entries';

interface EntriesSearchProps {
  isFetching?: boolean;
  searchEntries: (searchTerm: string, collectionNames: string[], page?: number) => void;
  clearSearch: () => void;
  searchTerm: string;
  collections?: Seq.Indexed<Collection>;
  collectionNames?: string[];
  entries?: ImmutableList<EntryMap>;
  page?: number;
  getWorkflowStatus?: (collectionName: string, slug: string) => string | null;
}

class EntriesSearch extends React.Component<EntriesSearchProps> {
  static propTypes = {
    isFetching: PropTypes.bool,
    searchEntries: PropTypes.func.isRequired,
    clearSearch: PropTypes.func.isRequired,
    searchTerm: PropTypes.string.isRequired,
    collections: ImmutablePropTypes.seq,
    collectionNames: PropTypes.array,
    entries: ImmutablePropTypes.list,
    page: PropTypes.number,
    getWorkflowStatus: PropTypes.func,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(EntriesSearch.propTypes, this.props, 'prop', 'EntriesSearch');

    const { searchTerm, searchEntries, collectionNames } = this.props;
    searchEntries(searchTerm, collectionNames || []);
  }

  componentDidUpdate(prevProps: EntriesSearchProps) {
    const { searchTerm, collectionNames } = this.props;

    // check if the search parameters are the same
    if (prevProps.searchTerm === searchTerm && isEqual(prevProps.collectionNames, collectionNames))
      return;

    const { searchEntries } = prevProps;
    searchEntries(searchTerm, collectionNames || []);
  }

  componentWillUnmount() {
    this.props.clearSearch();
  }

  getCursor = () => {
    const { page } = this.props;
    return Cursor.create({
      actions: isNaN(page as number) ? [] : ['append_next'],
    });
  };

  handleCursorActions = (action: string) => {
    const { page, searchTerm, searchEntries, collectionNames } = this.props;
    if (action === 'append_next') {
      const nextPage = (page || 0) + 1;
      searchEntries(searchTerm, collectionNames || [], nextPage);
    }
  };

  render() {
    const { collections, entries, isFetching, getWorkflowStatus } = this.props;
    return (
      <Entries
        cursor={this.getCursor()}
        handleCursorActions={this.handleCursorActions}
        collections={collections as any}
        entries={entries}
        isFetching={isFetching}
        getWorkflowStatus={getWorkflowStatus}
      />
    );
  }
}

function mapStateToProps(state: State, ownProps: { collections: any; searchTerm: string }) {
  const { searchTerm } = ownProps;
  const collections = ownProps.collections.toIndexedSeq();
  const collectionNames = ownProps.collections.keySeq().toArray() as string[];
  const isFetching = state.search.isFetching;
  const page = state.search.page;
  const entries = selectSearchedEntries(state, collectionNames);

  function getWorkflowStatus(collectionName: string, slug: string) {
    const unpublishedEntry = selectUnpublishedEntry(state, collectionName, slug);
    return unpublishedEntry ? unpublishedEntry.get('status') : null;
  }

  return { isFetching, page, collections, collectionNames, entries, searchTerm, getWorkflowStatus };
}

const mapDispatchToProps = {
  searchEntries: actionSearchEntries,
  clearSearch: actionClearSearch,
};

export default connect(mapStateToProps, mapDispatchToProps)(EntriesSearch);
