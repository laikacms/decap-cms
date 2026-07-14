import React from 'react';
import styled from '@emotion/styled';
import { useTranslate } from 'react-polyglot';
import partial from 'lodash/partial';
import { useStore } from 'react-redux';

import { Cursor } from '@/lib/util/index';
import { colors } from '@/ui/default/index';
import {
  loadEntries as actionLoadEntries,
  traverseCollectionCursor as actionTraverseCollectionCursor,
} from '@/core/actions/entries';
import { loadUnpublishedEntries } from '@/core/actions/editorialWorkflow';
import {
  selectEntries,
  selectEntriesLoaded,
  selectIsFetching,
  selectGroups,
} from '@/core/reducers/entries';
import { selectUnpublishedEntry, selectUnpublishedEntriesByStatus } from '@/core/reducers';
import Entries from './Entries';
// `selectCollectionEntriesCursor` builds a fresh `Cursor` per call; we select
// the raw stored data below and construct the `Cursor` in a memo instead.
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';

import type { Status } from '@/core/constants/publishModes';
import type {
  CmsCollectionState,
  CmsCollections,
  CmsEntry,
  CmsGroupOfEntries,
} from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const GroupHeading = styled.h2`
  font-size: 22px;
  font-weight: 600;
  line-height: 37px;
  padding-inline-start: 20px;
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

function withGroups(
  groups: CmsGroupOfEntries[],
  entries: CmsEntry[] | undefined,
  EntriesToRender: React.ComponentType<{ entries: CmsEntry[] | undefined }>,
  t: TranslateFunction,
) {
  return groups.map((group: CmsGroupOfEntries) => {
    const title = getGroupTitle(group, t);
    return (
      <GroupContainer key={group.id} className="GroupContainer" id={group.id}>
        <GroupHeading>{title}</GroupHeading>
        <EntriesToRender entries={getGroupEntries(entries, group.paths)} />
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

  function EntriesToRender({ entries: entriesArg }: { entries: CmsEntry[] | undefined }) {
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
      />
    );
  }

  if (groups && groups.length > 0) {
    return withGroups(groups, entries, EntriesToRender, t);
  }
  return <EntriesToRender entries={entries} />;
}

interface ConnectedProps {
  collection: CmsCollectionState;
  viewStyle?: string;
  filterTerm?: string;
}

export default function ConnectedEntriesCollection({
  collection,
  viewStyle,
  filterTerm,
}: ConnectedProps) {
  const t = useTranslate();
  const dispatch = useAppDispatch();

  const collections = useAppSelector((state: any) => state.collections as CmsCollections);
  const page = useAppSelector(
    (state: any) =>
      ((state.entries as any)?.pages?.[collection.name]?.page as number | undefined) ?? undefined,
  );
  const rawEntries = useAppSelector(
    (state: any) => selectEntries(state.entries, collection) as CmsEntry[],
    shallowArrayEqual,
  );
  const entries = React.useMemo(() => {
    if (collection.nested) {
      const collectionFolder = collection.folder as string;
      const nested = collection.nested;
      return filterNestedEntries(
        filterTerm || '',
        collectionFolder,
        rawEntries || [],
        nested ? nested.subfolders !== false : true,
      );
    }
    return rawEntries;
  }, [collection, filterTerm, rawEntries]);
  const groups = useAppSelector(
    (state: any) => selectGroups(state.entries, collection),
    shallowArrayEqual,
  );
  const entriesLoaded = useAppSelector((state: any) =>
    selectEntriesLoaded(state.entries, collection.name),
  );
  const isFetching = useAppSelector((state: any) =>
    selectIsFetching(state.entries, collection.name),
  );
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
      isFetching={isFetching}
      viewStyle={viewStyle}
      cursor={cursor}
      loadEntries={(c: CmsCollectionState) => dispatch(actionLoadEntries(c))}
      traverseCollectionCursor={(c: CmsCollectionState, action: string) =>
        dispatch(actionTraverseCollectionCursor(c, action))
      }
      entriesLoaded={entriesLoaded}
      loadUnpublishedEntries={(cols: CmsCollections | undefined) =>
        dispatch(loadUnpublishedEntries(cols as CmsCollections))
      }
      isEditorialWorkflowEnabled={isEditorialWorkflowEnabled}
      filterTerm={filterTerm}
      t={t}
      getWorkflowStatus={getWorkflowStatus}
      getUnpublishedEntries={getUnpublishedEntries}
    />
  );
}
