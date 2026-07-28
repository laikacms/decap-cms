import styled from '@emotion/styled';
import { partial } from 'lodash-es';
import React from 'react';
import { useStore } from 'react-redux';

import { loadUnpublishedEntries } from '@/core/actions/editorialWorkflow';
import {
  loadEntries as actionLoadEntries,
  traverseCollectionCursor as actionTraverseCollectionCursor,
} from '@/core/actions/entries';
import {
  extractSearchFields,
  getCollectionSearchFields,
  matchesSearchClauses,
  parseSearchTerm,
} from '@/core/backend';
import { useTranslate } from '@/core/i18n';
import { selectUnpublishedEntriesByStatus, selectUnpublishedEntry } from '@/core/reducers';
import { selectEntryCollectionTitle } from '@/core/reducers/collections';
import {
  selectEntries,
  selectEntriesLoaded,
  selectEntriesSortFields,
  selectGroups,
  selectIsFetching,
} from '@/core/reducers/entries';
import { Cursor } from '@/lib/util/index';
import { colors } from '@/ui/default/index';
import Entries from './Entries';
// `selectCollectionEntriesCursor` builds a fresh `Cursor` per call; we select
// the raw stored data below and construct the `Cursor` in a memo instead.
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';

import type { Status } from '@/core/constants/publishModes';
import type { EntryValue } from '@/core/valueObjects/Entry';
import type { CmsCollections, CmsCollectionState, CmsEntry, CmsGroupOfEntries, CmsSortObject } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const GroupHeading = styled.h2`
  font-size: 22px;
  font-weight: 600;
  line-height: 37px;
  color: ${colors.textLead};
`;

const GroupContainer = styled.div``;

function getGroupEntries(entries: CmsEntry[] | undefined, paths: Set<string>) {
  return entries?.filter(entry => paths.has(entry.path));
}

function getGroupTitle(group: CmsGroupOfEntries, t: TranslateFunction) {
  const { label, value } = group;
  if (value === undefined) {
    return t('collection.groups.other');
  }
  if (typeof value === 'boolean') {
    return value ? label : t('collection.groups.negateLabel', { label });
  }
  return `${label} ${value}`.trim();
}

type EntriesToRenderProps = {
  entries: CmsEntry[] | undefined,
  showPublishedEntries?: boolean,
  showUnpublishedEntries?: boolean,
};

function withGroups(
  groups: CmsGroupOfEntries[],
  entries: CmsEntry[] | undefined,
  EntriesToRender: React.ComponentType<EntriesToRenderProps>,
  t: TranslateFunction,
) {
  return groups.map((group: CmsGroupOfEntries) => {
    const title = getGroupTitle(group, t);
    return (
      <GroupContainer key={group.id} className="GroupContainer" id={group.id}>
        <GroupHeading>{title}</GroupHeading>
        <EntriesToRender
          entries={getGroupEntries(entries, group.paths)}
          showUnpublishedEntries={false}
        />
      </GroupContainer>
    );
  });
}

export function filterNestedEntries(
  path: string,
  collectionFolder: string,
  entries: CmsEntry[],
  subfolders: boolean,
) {
  const filtered = entries.filter((e: CmsEntry) => {
    let entryPath = e.path.slice(collectionFolder.length + 1);
    if (!entryPath.startsWith(path)) {
      return false;
    }
    if (path) {
      entryPath = entryPath.slice(path.length + 1);
    }
    if (subfolders) {
      const depth = entryPath.split('/').length;
      return path ? depth === 2 : depth <= 2;
    }
    return !entryPath.includes('/');
  });
  return filtered;
}

/**
 * Client-side filter over already-loaded entries. Backs the collection
 * toolbar's search field (DCMS-1229) — not a full-text search index, just a
 * filter over the currently rendered page. Reuses the same query grammar
 * (`field:value`, `field:"exact phrase"`, quoted phrases, `date:a..b` ranges,
 * combined with fuzzy free text) that the header "Search all" box sends
 * through `Backend.searchCollectionEntries` (see `core/backend.tsx` and
 * `core/README.md` §`search_fields and advanced search`), so both boxes
 * agree on the same collection's entries (DCMS-1545). A clause on a field
 * outside the collection's effective `search_fields` intentionally matches
 * nothing, same as the header path.
 */
export function filterEntriesBySearchQuery(
  collection: CmsCollectionState,
  entries: CmsEntry[],
  searchQuery: string | undefined,
): CmsEntry[] {
  const trimmed = searchQuery?.trim();
  if (!trimmed) {
    return entries;
  }

  const searchFields = getCollectionSearchFields(collection);
  const { clauses, freeText } = parseSearchTerm(trimmed);
  const freeTextQuery = freeText.trim().toLowerCase();
  const extractFields = extractSearchFields(searchFields);

  return entries.filter(entry => {
    // CmsEntry and EntryValue both carry `data`/`slug`/`path`; the shared
    // clause matcher only reads those, so the cast is safe at runtime.
    const entryValue = entry as unknown as EntryValue;

    if (!matchesSearchClauses(entryValue, searchFields, clauses)) {
      return false;
    }
    if (!freeTextQuery) {
      return true;
    }

    const title = selectEntryCollectionTitle(collection, entry);
    if (typeof title === 'string' && title.toLowerCase().includes(freeTextQuery)) {
      return true;
    }
    return extractFields(entryValue).toLowerCase().includes(freeTextQuery);
  });
}

function shallowArrayEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

interface EntriesCollectionProps {
  collection: CmsCollectionState;
  collections?: CmsCollections;
  page?: number;
  entries?: CmsEntry[];
  groups?: CmsGroupOfEntries[];
  isFetching: boolean;
  viewStyle?: string;
  cursor: Cursor;
  loadEntries: (collection: CmsCollectionState) => void;
  traverseCollectionCursor: (collection: CmsCollectionState, action: string) => void;
  entriesLoaded?: boolean;
  loadUnpublishedEntries: (collections: CmsCollections | undefined) => void;
  isEditorialWorkflowEnabled?: boolean;
  filterTerm?: string;
  t: TranslateFunction;
  getWorkflowStatus: (collectionName: string, slug: string) => string | null;
  getUnpublishedEntries: (collectionName: string) => CmsEntry[];
  sortFields?: CmsSortObject[];
}

export function EntriesCollection({
  collection,
  collections,
  page,
  entries,
  groups,
  isFetching,
  viewStyle,
  cursor,
  loadEntries,
  traverseCollectionCursor,
  entriesLoaded,
  loadUnpublishedEntries,
  isEditorialWorkflowEnabled,
  filterTerm,
  t,
  getWorkflowStatus,
  getUnpublishedEntries,
  sortFields,
}: EntriesCollectionProps) {
  const loadEntriesRef = React.useRef(loadEntries);
  loadEntriesRef.current = loadEntries;
  const loadUnpublishedEntriesRef = React.useRef(loadUnpublishedEntries);
  loadUnpublishedEntriesRef.current = loadUnpublishedEntries;

  React.useEffect(() => {
    if (collection && !entriesLoaded) {
      loadEntriesRef.current(collection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror componentDidMount + collection-change
  }, [collection]);

  React.useEffect(() => {
    if (isEditorialWorkflowEnabled) {
      loadUnpublishedEntriesRef.current(collections);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror prior behavior
  }, [collection, isEditorialWorkflowEnabled]);

  function handleCursorActions(_cursor: Cursor, action: string) {
    traverseCollectionCursor(collection, action);
  }

  function EntriesToRender(
    { entries: entriesArg, showPublishedEntries, showUnpublishedEntries }: EntriesToRenderProps,
  ) {
    return (
      <Entries
        collections={collection}
        entries={entriesArg}
        isFetching={isFetching}
        viewStyle={viewStyle}
        cursor={cursor}
        handleCursorActions={partial(handleCursorActions, cursor)}
        page={page}
        getWorkflowStatus={getWorkflowStatus}
        getUnpublishedEntries={getUnpublishedEntries}
        filterTerm={filterTerm}
        sortFields={sortFields}
        showPublishedEntries={showPublishedEntries}
        showUnpublishedEntries={showUnpublishedEntries}
      />
    );
  }

  if (groups && groups.length > 0) {
    return (
      <>
        {withGroups(groups, entries, EntriesToRender, t)}
        <EntriesToRender entries={entries} showPublishedEntries={false} />
      </>
    );
  }
  return <EntriesToRender entries={entries} />;
}

interface ConnectedProps {
  collection: CmsCollectionState;
  viewStyle?: string;
  filterTerm?: string;
  /**
   * Query from the collection toolbar's search field. Parsed with the same
   * advanced-search grammar as the header "Search all" box and matched
   * client-side (see `filterEntriesBySearchQuery`) — this is a filter over
   * the currently loaded page, not a full-text search index.
   */
  searchQuery?: string;
}

export default function ConnectedEntriesCollection({
  collection,
  viewStyle,
  filterTerm,
  searchQuery,
}: ConnectedProps) {
  const t = useTranslate();
  const dispatch = useAppDispatch();

  const collections = useAppSelector((state: any) => state.collections as CmsCollections);
  const page = useAppSelector(
    (state: any) => ((state.entries as any)?.pages?.[collection.name]?.page as number | undefined) ?? undefined,
  );
  const rawEntries = useAppSelector(
    (state: any) => selectEntries(state.entries, collection) as CmsEntry[],
    shallowArrayEqual,
  );
  const entries = React.useMemo(() => {
    let result = rawEntries;
    if (collection.nested) {
      const collectionFolder = collection.folder as string;
      const nested = collection.nested;
      result = filterNestedEntries(
        filterTerm || '',
        collectionFolder,
        result || [],
        nested ? nested.subfolders !== false : true,
      );
    }
    return filterEntriesBySearchQuery(collection, result || [], searchQuery);
  }, [collection, filterTerm, rawEntries, searchQuery]);
  const groups = useAppSelector(
    (state: any) => selectGroups(state.entries, collection),
    shallowArrayEqual,
  );
  const sortFields = useAppSelector(
    (state: any) => selectEntriesSortFields(state.entries, collection.name),
    shallowArrayEqual,
  );
  const entriesLoaded = useAppSelector((state: any) => selectEntriesLoaded(state.entries, collection.name));
  const isFetching = useAppSelector((state: any) => selectIsFetching(state.entries, collection.name));
  // Select the raw stored cursor data (a stable reference); the `Cursor`
  // instance is built in the memo below so the selector stays referentially
  // stable across unrelated dispatches.
  const rawCursorStore = useAppSelector(
    (state: any) => state.cursors?.cursorsByType?.collectionEntries?.[collection.name],
  );
  const cursor = React.useMemo(
    () => new Cursor(rawCursorStore ?? {}).clearData(),
    [rawCursorStore],
  );
  const isEditorialWorkflowEnabled = useAppSelector(
    (state: any) => state.config?.publish_mode === 'editorial_workflow',
  );

  // Read state lazily via the store instead of subscribing to the whole root
  // state: these callbacks only need a snapshot when invoked, and subscribing
  // to `(state) => state` would re-render this component on every dispatch.
  const store = useStore();
  const getWorkflowStatus = React.useCallback(
    (collectionName: string, slug: string) => {
      const unpublishedEntry = selectUnpublishedEntry(store.getState(), collectionName, slug);
      return unpublishedEntry ? (unpublishedEntry as any).status : null;
    },
    [store],
  );
  const getUnpublishedEntries = React.useCallback(
    (collectionName: string) => {
      if (!isEditorialWorkflowEnabled) return [];
      const allStatuses: Status[] = ['DRAFT', 'PENDING_REVIEW', 'PENDING_PUBLISH'];
      const unpublishedEntries: CmsEntry[] = [];
      allStatuses.forEach(statusKey => {
        const entriesForStatus = selectUnpublishedEntriesByStatus(store.getState(), statusKey);
        if (entriesForStatus) {
          entriesForStatus.forEach((entry: any) => {
            if (entry.collection === collectionName) {
              unpublishedEntries.push(entry as CmsEntry);
            }
          });
        }
      });
      return unpublishedEntries;
    },
    [store, isEditorialWorkflowEnabled],
  );

  return (
    <EntriesCollection
      collection={collection}
      collections={collections}
      page={page}
      entries={entries}
      groups={groups}
      sortFields={sortFields}
      isFetching={isFetching}
      viewStyle={viewStyle}
      cursor={cursor}
      loadEntries={(c: CmsCollectionState) => dispatch(actionLoadEntries(c))}
      traverseCollectionCursor={(c: CmsCollectionState, action: string) =>
        dispatch(actionTraverseCollectionCursor(c, action))}
      entriesLoaded={entriesLoaded}
      loadUnpublishedEntries={(cols: CmsCollections | undefined) =>
        dispatch(loadUnpublishedEntries(cols as CmsCollections))}
      isEditorialWorkflowEnabled={isEditorialWorkflowEnabled}
      filterTerm={filterTerm}
      t={t}
      getWorkflowStatus={getWorkflowStatus}
      getUnpublishedEntries={getUnpublishedEntries}
    />
  );
}
