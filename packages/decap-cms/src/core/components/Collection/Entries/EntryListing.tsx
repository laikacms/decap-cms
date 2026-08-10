import styled from '@emotion/styled';
import { orderBy } from 'lodash-es';
import React from 'react';

import { useTranslate } from '@/core/i18n';
import { useCmsSlots } from '@/core/lib/slots';
import { selectFields, selectInferredField, selectSortDataPath } from '@/core/reducers/collections';
import { CmsSortDirection } from '@/lib/util/index';
import { colors } from '@/ui/default/index';
import InViewTrigger from '@/ui/default/InViewTrigger';
import { filterNestedEntries } from './EntriesCollection';
import EntryCard from './EntryCard';

import type { EntryCardRenderProps } from '@/core/lib/slots';
import type { CmsCollections, CmsCollectionState, CmsEntry, CmsSortObject } from '@/lib/util/index';
import type { Cursor } from '@/lib/util/index';

const CardsGrid = styled.ul`
  display: flex;
  flex-flow: row wrap;
  list-style-type: none;
  margin-left: -12px;
  margin-top: 16px;
  margin-bottom: 16px;
`;

const SectionSeparator = styled.div`
  display: flex;
  align-items: center;
  margin: 16px 0 8px;
`;

const SectionHeading = styled.h2`
  font-size: 22px;
  font-weight: 600;
  line-height: 37px;
  padding-inline-start: 20px;
  color: ${colors.textLead};
`;

interface EntryListingProps {
  collections: CmsCollectionState | CmsCollections;
  entries?: CmsEntry[] | undefined;
  viewStyle?: string | undefined;
  cursor: Cursor;
  handleCursorActions: (action: string) => void;
  page?: number | undefined;
  getUnpublishedEntries?: ((collectionName: string) => CmsEntry[]) | undefined;
  getWorkflowStatus?: ((collectionName: string, slug: string) => string | null) | undefined;
  filterTerm?: string | undefined;
  sortFields?: CmsSortObject[] | undefined;
  showPublishedEntries?: boolean;
  showUnpublishedEntries?: boolean;
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

function sortEntries(
  entries: CmsEntry[],
  sortFields: CmsSortObject[] | undefined,
  collection: CmsCollectionState,
) {
  if (!sortFields || sortFields.length === 0) {
    return entries;
  }

  const keys = sortFields.map(v => selectSortDataPath(collection, v.key));
  const orders = sortFields.map(v => v.direction === CmsSortDirection.Ascending ? 'asc' : 'desc');
  return orderBy(entries, keys, orders);
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
  sortFields,
  showPublishedEntries = true,
  showUnpublishedEntries = true,
}: EntryListingProps) {
  const hasMore = cursor?.actions?.has('append_next');
  const { renderEntryCard, renderEntryListEmpty } = useCmsSlots();
  const t = useTranslate();

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

  function getUnpublishedEntriesList(): CmsEntry[] {
    const collectionName = isSingleCollection(collections) ? collections.name : null;
    if (!collectionName) return [];

    const unpublishedEntries = getUnpublishedEntries?.(collectionName);
    if (!unpublishedEntries || unpublishedEntries.length === 0) {
      return [];
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

    const publishedSlugs = new Set((entries ?? []).map(entry => entry.slug));
    const uniqueUnpublished = unpublishedList.filter(entry => !publishedSlugs.has(entry.slug));
    return sortEntries(uniqueUnpublished as CmsEntry[], sortFields, collections as CmsCollectionState);
  }

  function renderCardsForSingleCollection() {
    const collectionFields = inferFields(collections as CmsCollectionState);
    const entryCardProps = {
      collection: collections as CmsCollectionState,
      inferredFields: collectionFields,
      viewStyle,
    };

    const publishedCards = showPublishedEntries
      ? entries?.map((entry, idx) => {
        const workflowStatus = getWorkflowStatus?.(
          (collections as CmsCollectionState).name,
          entry.slug,
        );
        return renderEntry({ ...entryCardProps, entry, workflowStatus }, `published-${idx}`);
      }) ?? []
      : [];

    const unpublishedEntries = showUnpublishedEntries ? getUnpublishedEntriesList() : [];
    const unpublishedCards = unpublishedEntries.map((entry, idx) => {
      const workflowStatus = getWorkflowStatus?.(
        (collections as CmsCollectionState).name,
        entry.slug,
      );
      return renderEntry({ ...entryCardProps, entry, workflowStatus }, `unpublished-${idx}`);
    });

    return { publishedCards, unpublishedCards };
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

  const isSingle = isSingleCollection(collections);
  const { publishedCards, unpublishedCards } = isSingle
    ? renderCardsForSingleCollection()
    : { publishedCards: renderCardsForMultipleCollections() ?? [], unpublishedCards: [] };

  const cardCount = publishedCards.filter(Boolean).length + unpublishedCards.filter(Boolean).length;
  const showEmptyState = !!renderEntryListEmpty && cardCount === 0;

  return (
    <div>
      {showEmptyState
        ? (
          renderEntryListEmpty({
            collection: isSingle ? collections : undefined,
          })
        )
        : (
          <>
            {(!isSingle || showPublishedEntries) && (
              <CardsGrid className="CardsGrid">
                {publishedCards}
                {hasMore && <InViewTrigger key={page} onEnter={handleLoadMore} />}
              </CardsGrid>
            )}
            {isSingle && unpublishedCards.length > 0 && (
              <>
                <SectionSeparator>
                  <SectionHeading>{t('collection.entries.unpublishedHeader')}</SectionHeading>
                </SectionSeparator>
                <CardsGrid className="CardsGrid">{unpublishedCards}</CardsGrid>
              </>
            )}
          </>
        )}
    </div>
  );
}

export default EntryListing;
