import React from 'react';
import styled from '@emotion/styled';
import { Waypoint } from 'react-waypoint';

import type { Cursor } from 'decap-cms-lib-util';
import type { CmsCollectionState, CmsCollections, CmsEntry } from 'decap-cms-lib-util';

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
  collections: CmsCollectionState | CmsCollections;
  entries?: CmsEntry[];
  viewStyle?: string;
  cursor: Cursor;
  handleCursorActions: (action: string) => void;
  page?: number;
  getUnpublishedEntries?: (collectionName: string) => CmsEntry[];
  getWorkflowStatus?: (collectionName: string, slug: string) => string | null;
  filterTerm?: string;
}

function isSingleCollection(collections: CmsCollectionState | CmsCollections): collections is CmsCollectionState {
  return (
    'name' in collections &&
    'fields' in collections &&
    typeof (collections as CmsCollectionState).type === 'string'
  );
}

class EntryListing extends React.Component<EntryListingProps> {
  hasMore = () => {
    const hasMore = this.props.cursor?.actions?.has('append_next');
    return hasMore;
  };

  handleLoadMore = () => {
    if (this.hasMore()) {
      this.props.handleCursorActions('append_next');
    }
  };

  inferFields = (collection: CmsCollectionState) => {
    const titleField = selectInferredField(collection, 'title');
    const descriptionField = selectInferredField(collection, 'description');
    const imageField = selectInferredField(collection, 'image');
    const fields = selectFields(collection, '');
    const inferredFields = [titleField, descriptionField, imageField];
    const remainingFields =
      fields && fields.filter(f => inferredFields.indexOf((f as any).name) === -1);
    return { titleField, descriptionField, imageField, remainingFields };
  };

  getAllEntries = () => {
    const { entries, collections, filterTerm } = this.props;
    const collectionName = isSingleCollection(collections) ? collections.name : null;

    if (!collectionName) {
      return entries;
    }

    const unpublishedEntries = this.props.getUnpublishedEntries?.(collectionName);

    if (!unpublishedEntries || unpublishedEntries.length === 0) {
      return entries;
    }

    let unpublishedList = [...unpublishedEntries];

    if (isSingleCollection(collections) && collections.nested && filterTerm) {
      const collectionFolder = collections.folder as string;
      const nested = collections.nested;
      const subfolders = nested ? nested.subfolders !== false : true;

      unpublishedList = filterNestedEntries(
        filterTerm,
        collectionFolder,
        unpublishedList as CmsEntry[],
        subfolders,
      );
    }

    if (!entries) {
      return unpublishedList as CmsEntry[];
    }

    const publishedSlugs = new Set(entries.map(entry => entry.slug));
    const uniqueUnpublished = unpublishedList.filter(entry => !publishedSlugs.has(entry.slug));

    return [...entries, ...uniqueUnpublished];
  };

  renderCardsForSingleCollection = () => {
    const { collections, viewStyle } = this.props;
    const allEntries = this.getAllEntries();
    const inferredFields = this.inferFields(collections as CmsCollectionState);
    const entryCardProps = { collection: collections, inferredFields, viewStyle };

    return allEntries?.map((entry, idx) => {
      const workflowStatus = this.props.getWorkflowStatus?.(
        (collections as CmsCollectionState).name,
        entry.slug,
      );

      return (
        <EntryCard {...entryCardProps} entry={entry} workflowStatus={workflowStatus} key={idx} />
      );
    });
  };

  renderCardsForMultipleCollections = () => {
    const { collections, entries } = this.props;
    const collectionsRecord = collections as CmsCollections;
    const collectionValues = Object.values(collectionsRecord);
    const isSingleCollectionInList = collectionValues.length === 1;
    return entries?.map((entry, idx) => {
      const collectionName = entry.collection;
      const collection = collectionValues.find((coll: CmsCollectionState) => coll.name === collectionName);
      if (!collection) return null;
      const collectionLabel = !isSingleCollectionInList && collection.label;
      const inferredFields = this.inferFields(collection);
      const workflowStatus = this.props.getWorkflowStatus?.(collectionName, entry.slug);
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
