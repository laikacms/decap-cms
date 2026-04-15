import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { Waypoint } from 'react-waypoint';
import { Map, List } from 'immutable';

import type { List as ImmutableList } from 'immutable';
import type { Cursor } from 'decap-cms-lib-util';
import type { Collection, Collections, EntryMap } from '../../../types/cms';

import { selectFields, selectInferredField } from '../../../reducers/collections';
import { filterNestedEntries } from './EntriesCollection';
import EntryCard from './EntryCard';

const CardsGrid = styled.ul`
  display: flex;
  flex-flow: row wrap;
  list-style-type: none;
  margin-left: -12px;
  margin-top: 16px;
  margin-bottom: 16px;
`;

interface EntryListingProps {
  collections: Collection | Collections;
  entries?: ImmutableList<EntryMap>;
  viewStyle?: string;
  cursor: Cursor;
  handleCursorActions: (action: string) => void;
  page?: number;
  getUnpublishedEntries?: (collectionName: string) => EntryMap[];
  getWorkflowStatus?: (collectionName: string, slug: string) => string | null;
  filterTerm?: string;
}

class EntryListing extends React.Component<EntryListingProps> {
  static propTypes = {
    collections: ImmutablePropTypes.iterable.isRequired,
    entries: ImmutablePropTypes.list,
    viewStyle: PropTypes.string,
    cursor: PropTypes.any.isRequired,
    handleCursorActions: PropTypes.func.isRequired,
    page: PropTypes.number,
    getUnpublishedEntries: PropTypes.func.isRequired,
    getWorkflowStatus: PropTypes.func.isRequired,
    filterTerm: PropTypes.string,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(EntryListing.propTypes, this.props, 'prop', 'EntryListing');
  }

  hasMore = () => {
    const hasMore = this.props.cursor?.actions?.has('append_next');
    return hasMore;
  };

  handleLoadMore = () => {
    if (this.hasMore()) {
      this.props.handleCursorActions('append_next');
    }
  };

  inferFields = (collection: Collection) => {
    const titleField = selectInferredField(collection, 'title');
    const descriptionField = selectInferredField(collection, 'description');
    const imageField = selectInferredField(collection, 'image');
    const fields = selectFields(collection, '');
    const inferredFields = [titleField, descriptionField, imageField];
    const remainingFields =
      fields && fields.filter(f => inferredFields.indexOf(f.get('name')) === -1);
    return { titleField, descriptionField, imageField, remainingFields };
  };

  getAllEntries = () => {
    const { entries, collections, filterTerm } = this.props;
    const collectionName = Map.isMap(collections) ? (collections as Collection).get('name') : null;

    if (!collectionName) {
      return entries;
    }

    const unpublishedEntries = this.props.getUnpublishedEntries?.(collectionName);

    if (!unpublishedEntries || unpublishedEntries.length === 0) {
      return entries;
    }

    let unpublishedList = List(unpublishedEntries.map(entry => entry));

    if ((collections as Collection).has('nested') && filterTerm) {
      const collectionFolder = (collections as Collection).get('folder') as string;
      const nested = (collections as Collection).get('nested');
      const subfolders = nested ? nested.get('subfolders') !== false : true;

      unpublishedList = filterNestedEntries(
        filterTerm,
        collectionFolder,
        unpublishedList as ImmutableList<EntryMap>,
        subfolders,
      );
    }

    if (!entries) {
      return unpublishedList as ImmutableList<EntryMap>;
    }

    const publishedSlugs = entries.map(entry => entry.get('slug')).toSet();
    const uniqueUnpublished = unpublishedList.filterNot(entry =>
      publishedSlugs.has(entry.get('slug')),
    );

    return entries.concat(uniqueUnpublished);
  };

  renderCardsForSingleCollection = () => {
    const { collections, viewStyle } = this.props;
    const allEntries = this.getAllEntries();
    const inferredFields = this.inferFields(collections as Collection);
    const entryCardProps = { collection: collections, inferredFields, viewStyle };

    return allEntries?.map((entry, idx) => {
      const workflowStatus = this.props.getWorkflowStatus?.(
        (collections as Collection).get('name'),
        entry.get('slug'),
      );

      return (
        <EntryCard {...entryCardProps} entry={entry} workflowStatus={workflowStatus} key={idx} />
      );
    });
  };

  renderCardsForMultipleCollections = () => {
    const { collections, entries } = this.props;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isSingleCollectionInList = (collections as any).size === 1;
    return entries?.map((entry, idx) => {
      const collectionName = entry.get('collection');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const collection = (collections as any).find(
        (coll: Collection) => coll.get('name') === collectionName,
      );
      const collectionLabel = !isSingleCollectionInList && collection?.get('label');
      const inferredFields = this.inferFields(collection as Collection);
      const workflowStatus = this.props.getWorkflowStatus?.(collectionName, entry.get('slug'));
      const entryCardProps = {
        collection,
        entry,
        inferredFields,
        collectionLabel,
        workflowStatus,
      };
      return <EntryCard {...entryCardProps} key={idx} />;
    });
  };

  render() {
    const { collections, page } = this.props;

    return (
      <div>
        <CardsGrid>
          {Map.isMap(collections)
            ? this.renderCardsForSingleCollection()
            : this.renderCardsForMultipleCollections()}
          {this.hasMore() && <Waypoint key={page} onEnter={this.handleLoadMore} />}
        </CardsGrid>
      </div>
    );
  }
}

export default EntryListing;
