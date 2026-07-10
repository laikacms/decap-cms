import React from 'react';
import styled from '@emotion/styled';

import { lengths } from '../../../ui/default/index';
import ViewStyleControl from './ViewStyleControl';
import SortControl from './SortControl';
import FilterControl from './FilterControl';
import GroupControl from './GroupControl';

import type { CmsViewFilter, CmsViewGroup, CmsSortDirection } from '../../../lib/util/index';
import type { TranslateFunction } from '../../../ui/default/index';

const CollectionControlsContainer = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  margin-top: 22px;
  width: ${lengths.topCardWidth};
  max-width: 100%;

  & > div {
    margin-left: 6px;
  }
`;

interface CollectionControlsProps {
  viewStyle: string;
  onChangeViewStyle: (style: string) => void;
  sortableFields: { key: string; label?: string }[];
  onSortClick: (key: string, direction: CmsSortDirection) => void;
  sort?: Record<string, unknown>;
  viewFilters?: CmsViewFilter[];
  viewGroups?: CmsViewGroup[];
  onFilterClick: (filter: CmsViewFilter) => void;
  onGroupClick: (group: CmsViewGroup) => void;
  t: TranslateFunction;
  filter?: Record<string, unknown>;
  group?: Record<string, unknown>;
}

function CollectionControls({
  viewStyle,
  onChangeViewStyle,
  sortableFields,
  onSortClick,
  sort,
  viewFilters,
  viewGroups,
  onFilterClick,
  onGroupClick,
  t,
  filter,
  group,
}: CollectionControlsProps) {
  return (
    <CollectionControlsContainer>
      <ViewStyleControl viewStyle={viewStyle} onChangeViewStyle={onChangeViewStyle} t={t} />
      {viewGroups && viewGroups.length > 0 && group && (
        <GroupControl viewGroups={viewGroups} onGroupClick={onGroupClick} group={group} />
      )}
      {viewFilters && viewFilters.length > 0 && filter && (
        <FilterControl viewFilters={viewFilters} onFilterClick={onFilterClick} filter={filter} />
      )}
      {sortableFields && sortableFields.length > 0 && (
        <SortControl fields={sortableFields} sort={sort} onSortClick={onSortClick} />
      )}
    </CollectionControlsContainer>
  );
}

export default CollectionControls;
