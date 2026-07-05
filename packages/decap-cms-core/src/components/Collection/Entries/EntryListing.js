import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';
import { Waypoint } from 'react-waypoint';

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

function isSingleCollection(collections) {
  return !Array.isArray(collections);
}

class EntryListing extends React.Component {
  static propTypes = {
    collections: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
    entries: PropTypes.array,
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

  inferFields = collection => {
    const titleField = selectInferredField(collection, 'title');
    const descriptionField = selectInferredField(collection, 'description');
    const imageField = selectInferredField(collection, 'image');
    const fields = selectFields(collection);
    const inferredFields = [titleField, descriptionField, imageField];
    const remainingFields = fields && fields.filter(f => inferredFields.indexOf(f.name) === -1);
    return { titleField, descriptionField, imageField, remainingFields };
  };

  getAllEntries = () => {
    const { entries, collections, filterTerm } = this.props;
    const collectionName = isSingleCollection(collections) ? collections.name : null;

    if (!collectionName) {
      return entries;
    }

    const unpublishedEntries = this.props.getUnpublishedEntries(collectionName);

    if (!unpublishedEntries || unpublishedEntries.length === 0) {
      return entries;
    }

    let unpublishedList = [...unpublishedEntries];

    if (collections.nested && filterTerm) {
      const collectionFolder = collections.folder;
      const subfolders = collections.nested.subfolders !== false;

      unpublishedList = filterNestedEntries(
        filterTerm,
        collectionFolder,
        unpublishedList,
        subfolders,
      );
    }

    const publishedSlugs = new Set(entries.map(entry => entry.slug));
    const uniqueUnpublished = unpublishedList.filter(entry => !publishedSlugs.has(entry.slug));

    return entries.concat(uniqueUnpublished);
  };

  renderCardsForSingleCollection = () => {
    const { collections, viewStyle } = this.props;
    const allEntries = this.getAllEntries();
    const inferredFields = this.inferFields(collections);
    const entryCardProps = { collection: collections, inferredFields, viewStyle };

    return allEntries.map((entry, idx) => {
      const workflowStatus = this.props.getWorkflowStatus(collections.name, entry.slug);

      return (
        <EntryCard {...entryCardProps} entry={entry} workflowStatus={workflowStatus} key={idx} />
      );
    });
  };

  renderCardsForMultipleCollections = () => {
    const { collections, entries } = this.props;
    const isSingleCollectionInList = collections.length === 1;
    return entries.map((entry, idx) => {
      const collectionName = entry.collection;
      const collection = collections.find(coll => coll.name === collectionName);
      const collectionLabel = !isSingleCollectionInList && collection.label;
      const inferredFields = this.inferFields(collection);
      const workflowStatus = this.props.getWorkflowStatus(collectionName, entry.slug);
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
          {isSingleCollection(collections)
            ? this.renderCardsForSingleCollection()
            : this.renderCardsForMultipleCollections()}
          {this.hasMore() && <Waypoint key={page} onEnter={this.handleLoadMore} />}
        </CardsGrid>
      </div>
    );
  }
}

export default EntryListing;
