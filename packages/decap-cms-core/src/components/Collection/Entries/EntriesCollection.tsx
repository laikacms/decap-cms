import React from 'react';
import { connect } from 'react-redux';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import partial from 'lodash/partial';
import { Cursor } from 'decap-cms-lib-util';
import { colors } from 'decap-cms-ui-default';


import {
  loadEntries as actionLoadEntries,
  traverseCollectionCursor as actionTraverseCollectionCursor,
} from '../../../actions/entries';
import { loadUnpublishedEntries } from '../../../actions/editorialWorkflow';
import {
  selectEntries,
  selectEntriesLoaded,
  selectIsFetching,
  selectGroups,
} from '../../../reducers/entries';
import { selectUnpublishedEntry, selectUnpublishedEntriesByStatus } from '../../../reducers';
import { selectCollectionEntriesCursor } from '../../../reducers/cursors';
import Entries from './Entries';

import type { Status } from '../../../constants/publishModes';
import type {
  CmsCollectionState,
  CmsCollections,
  CmsEntry,
  CmsGroupOfEntries,
} from 'decap-cms-lib-util';
import type { TranslateFunction } from 'decap-cms-ui-default';

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
      <GroupContainer key={group.id} id={group.id}>
        <GroupHeading>{title}</GroupHeading>
        <EntriesToRender entries={getGroupEntries(entries, group.paths)} />
      </GroupContainer>
    );
  });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror componentDidMount + collection-change in componentDidUpdate
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

    // for subdirectories, trim off the parent folder corresponding to
    // this nested collection entry
    if (path) {
      entryPath = entryPath.slice(path.length + 1);
    }

    // if subfolders legacy mode is enabled, show only immediate subfolders
    // also show index file in root folder
    if (subfolders) {
      const depth = entryPath.split('/').length;
      return path ? depth === 2 : depth <= 2;
    }

    // only show immediate children
    return !entryPath.includes('/');
  });
  return filtered;
}

function mapStateToProps(
  state: any,
  ownProps: { collection: CmsCollectionState; viewStyle?: string; filterTerm?: string },
) {
  const { collection, viewStyle, filterTerm } = ownProps;
  const page = (state.entries as any)?.pages?.[collection.name]?.page as number | undefined;

  const collections = state.collections;

  let entries = selectEntries(state.entries, collection) as CmsEntry[];
  const groups = selectGroups(state.entries, collection);

  if (collection.nested) {
    const collectionFolder = collection.folder as string;
    const nested = collection.nested;
    entries = filterNestedEntries(
      filterTerm || '',
      collectionFolder,
      entries,
      nested ? nested.subfolders !== false : true,
    );
  }
  const entriesLoaded = selectEntriesLoaded(state.entries, collection.name);
  const isFetching = selectIsFetching(state.entries, collection.name);

  const rawCursor = selectCollectionEntriesCursor(state.cursors as any, collection.name);
  const cursor = Cursor.create(rawCursor).clearData();

  const isEditorialWorkflowEnabled = state.config?.publish_mode === 'editorial_workflow';

  return {
    collection,
    collections,
    page,
    entries,
    groups,
    entriesLoaded,
    isFetching,
    viewStyle,
    cursor,
    isEditorialWorkflowEnabled,
    getWorkflowStatus: (collectionName: string, slug: string) => {
      const unpublishedEntry = selectUnpublishedEntry(state, collectionName, slug);
      return unpublishedEntry ? (unpublishedEntry as any).status : null;
    },
    getUnpublishedEntries: (collectionName: string) => {
      if (!isEditorialWorkflowEnabled) return [];

      const allStatuses: Status[] = ['DRAFT', 'PENDING_REVIEW', 'PENDING_PUBLISH'];
      const unpublishedEntries: CmsEntry[] = [];

      allStatuses.forEach(statusKey => {
        const entriesForStatus = selectUnpublishedEntriesByStatus(state, statusKey);
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
  };
}

const mapDispatchToProps = {
  loadEntries: actionLoadEntries,
  traverseCollectionCursor: actionTraverseCollectionCursor,
  loadUnpublishedEntries: (collections: CmsCollections | undefined) =>
    loadUnpublishedEntries(collections as CmsCollections),
};

function shallowArrayEqual(a: unknown[], b: unknown[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const ConnectedEntriesCollection = connect(mapStateToProps, mapDispatchToProps, null, {
  areStatePropsEqual(next: Record<string, unknown>, prev: Record<string, unknown>) {
    // mapStateToProps creates new references every call for entries, groups,
    // cursor, and inline functions. Compare by content where possible to
    // prevent infinite re-render loops from react-redux connect().
    for (const key of Object.keys(next)) {
      const a = next[key];
      const b = prev[key];
      if (a === b) continue;
      // Arrays (entries, groups): compare element-wise
      if (Array.isArray(a) && Array.isArray(b) && shallowArrayEqual(a, b)) continue;
      // Functions (getWorkflowStatus, getUnpublishedEntries): always new refs, skip
      if (typeof a === 'function' && typeof b === 'function') continue;
      // Cursor objects: compare by data equality (they're always new instances)
      if (a instanceof Cursor && b instanceof Cursor) continue;
      return false;
    }
    return true;
  },
})(EntriesCollection);

export default translate()(ConnectedEntriesCollection);
