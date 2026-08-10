import styled from '@emotion/styled';
import React from 'react';

import { colors, Icon, lengths } from '@/ui/default/index';
import FilterControl from './FilterControl';
import GroupControl from './GroupControl';
import SortControl from './SortControl';
import ViewStyleControl from './ViewStyleControl';

import type { CmsSortDirection, CmsViewFilter, CmsViewGroup } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const CollectionControlsContainer = styled.div`
  display: flex;
  flex-flow: row-reverse wrap;
  align-items: center;
  gap: 6px 0;
  margin-top: 22px;
  width: ${lengths.topCardWidth};
  max-width: 100%;

  @media (min-width: 500px) {
    gap: 6px;
  }
`;

const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  gap: 6px;
  padding: 0 6px;
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  color: ${colors.controlLabel};

  .decap-icon {
    flex: 0 0 auto;
    display: flex;
  }
`;

const SearchField = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: transparent;
  font-size: 14px;
  color: inherit;
  padding: 8px 0;

  &::placeholder {
    color: ${colors.controlLabel};
  }

  &:focus {
    outline: none;
  }
`;

interface CollectionControlsProps {
  viewStyle: string;
  onChangeViewStyle: (style: string) => void;
  sortableFields: { key: string, label?: string }[];
  onSortClick: (key: string, direction: CmsSortDirection) => void;
  sort?: Record<string, unknown> | undefined;
  viewFilters?: CmsViewFilter[] | undefined;
  viewGroups?: CmsViewGroup[] | undefined;
  onFilterClick: (filter: CmsViewFilter) => void;
  onGroupClick: (group: CmsViewGroup) => void;
  t: TranslateFunction;
  filter?: Record<string, unknown> | undefined;
  group?: Record<string, unknown> | undefined;
  searchQuery?: string;
  /** Omit to hide the search field entirely (e.g. no searchable entries). */
  onSearchChange?: (query: string) => void;
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
  searchQuery,
  onSearchChange,
}: CollectionControlsProps) {
  const searchLabel = t('collection.collectionTop.searchEntries');
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
      {onSearchChange
        ? (
          <SearchWrap>
            <Icon type="search" size="xsmall" />
            <SearchField
              type="search"
              value={searchQuery ?? ''}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchLabel}
              aria-label={searchLabel}
            />
          </SearchWrap>
        )
        : null}
    </CollectionControlsContainer>
  );
}

export default CollectionControls;
