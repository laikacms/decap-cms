import React from 'react';
import styled from '@emotion/styled';

import InViewTrigger from '@/ui/default/InViewTrigger';
import { selectFields, selectInferredField } from '@/core/reducers/collections';
import { filterNestedEntries } from './EntriesCollection';
import EntryCard from './EntryCard';
import { useCmsSlots } from '@/core/lib/slots';

import type { EntryCardRenderProps } from '@/core/lib/slots';
import type { CmsCollectionState, CmsCollections, CmsEntry } from '@/lib/util/index';
import type { Cursor } from '@/lib/util/index';

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

function isSingleCollection(
  collections: CmsCollectionState | CmsCollections,
): collections is CmsCollectionState {
  // Single collections always have a `type` (set by `applyDefaults` to either
  // `folder_based_collection` or `file_based_collection`) and a `name`.
  // The earlier `'fields' in collections` check incorrectly returned false
  // for file-based collections, which carry `files` instead.
  return 'name' in collections && typeof (collections as CmsCollectionState).type === 'string';
}

function inferFields(collection: CmsCollectionState) {
  const titleField = selectInferredField(collection, 'title');
  const descriptionField = selectInferredField(collection, 'description');
  const imageField = selectInferredField(collection, 'image');
  const fields = selectFields(collection, '');
  const inferred = [titleField, descriptionField, imageField];
  const remainingFields = fields && fields.filter(f => inferred.indexOf((f as any).name) === -1);
  return { titleField, descriptionField, imageField, remainingFields };
}

function EntryListing({
  collections,
  entries,
  viewStyle,
  cursor,
  handleCursorActions,
  page,
  getUnpublishedEntries,
  getWorkflowStatus,
  filterTerm,
}: EntryListingProps) {
  const hasMore = cursor?.actions?.has('append_next');
  const { renderEntryCard, renderEntryListEmpty } = useCmsSlots();

  function renderEntry(props: EntryCardRenderProps, key: string | number) {
    if (renderEntryCard) {
      return <React.Fragment key={key}>{renderEntryCard(props)}</React.Fragment>;
    }
    return <EntryCard {...props} key={key} />;
  }

  function handleLoadMore() {
    if (hasMore) {
      handleCursorActions('append_next');
    }
  }

  function getAllEntries() {
    const collectionName = isSingleCollection(collections) ? collections.name : null;
    if (!collectionName) return entries;

    const unpublishedEntries = getUnpublishedEntries?.(collectionName);
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
  }

  function renderCardsForSingleCollection() {
    const allEntries = getAllEntries();
    const collectionFields = inferFields(collections as CmsCollectionState);
    const entryCardProps = {
      collection: collections as CmsCollectionState,
      inferredFields: collectionFields,
      viewStyle,
    };

    return allEntries?.map((entry, idx) => {
      const workflowStatus = getWorkflowStatus?.(
        (collections as CmsCollectionState).name,
        entry.slug,
      );
      return renderEntry({ ...entryCardProps, entry, workflowStatus }, idx);
    });
  }

  function renderCardsForMultipleCollections() {
    const collectionsRecord = collections as CmsCollections;
    const collectionValues = Object.values(collectionsRecord);
    const isSingleCollectionInList = collectionValues.length === 1;
    return entries?.map((entry, idx) => {
      const collectionName = entry.collection;
      const collection = collectionValues.find(
        (coll: CmsCollectionState) => coll.name === collectionName,
      );
      if (!collection) return null;
      const collectionLabel = !isSingleCollectionInList && collection.label;
      const fields = inferFields(collection);
      const workflowStatus = getWorkflowStatus?.(collectionName, entry.slug);
      return renderEntry(
        {
          collection,
          entry,
          inferredFields: fields,
          collectionLabel,
          workflowStatus,
        },
        idx,
      );
    });
  }

  const cards = isSingleCollection(collections)
    ? renderCardsForSingleCollection()
    : renderCardsForMultipleCollections();
  const cardCount = Array.isArray(cards) ? cards.filter(Boolean).length : 0;
  const showEmptyState = !!renderEntryListEmpty && Array.isArray(cards) && cardCount === 0;

  return (
    <div>
      {showEmptyState ? (
        renderEntryListEmpty({
          collection: isSingleCollection(collections) ? collections : undefined,
        })
      ) : (
        <CardsGrid className="CardsGrid">
          {cards}
          {hasMore && <InViewTrigger key={page} onEnter={handleLoadMore} />}
        </CardsGrid>
      )}
    </div>
  );
}

export default EntryListing;
