import styled from '@emotion/styled';
import React from 'react';

import FilterControl from '@/core/components/Collection/FilterControl';
import GroupControl from '@/core/components/Collection/GroupControl';
import SortControl from '@/core/components/Collection/SortControl';
import { translate } from '@/core/i18n';
import { colors, Icon } from '@/ui/default/index';
import { LaikaIconButton } from './ui';

import type { CollectionControlsRenderProps } from '@/app/components/index';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Laika-styled toolbar for collection listings. Re-uses core's Sort/Filter/
 * Group dropdowns (they're already themed via the design tokens) while
 * swapping the view-style toggle for a LaikaIconButton pair so the row
 * matches laika's button language.
 */

const VIEW_STYLE_LIST = 'VIEW_STYLE_LIST';
const VIEW_STYLE_GRID = 'VIEW_STYLE_GRID';

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 16px 0 20px;
  padding: 6px 8px;
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.foreground};
  border-radius: 9999px;
`;

const Divider = styled.span`
  width: 1px;
  height: 18px;
  background-color: ${colors.textFieldBorder};
  margin: 0 4px;
`;

const ViewToggleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`;

const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  gap: 6px;
  padding: 0 4px 0 8px;
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
  padding: 6px 0;

  &::placeholder {
    color: ${colors.controlLabel};
  }

  &:focus {
    outline: none;
  }
`;

interface LaikaCollectionControlsProps extends CollectionControlsRenderProps {
  t: TranslateFunction;
}

function LaikaCollectionControls({
  viewStyle,
  onChangeViewStyle,
  sortableFields,
  onSortClick,
  sort,
  viewFilters,
  viewGroups,
  onFilterClick,
  onGroupClick,
  filter,
  group,
  searchQuery,
  onSearchChange,
  t,
}: LaikaCollectionControlsProps) {
  const hasFilter = viewFilters && viewFilters.length > 0 && filter;
  const hasGroup = viewGroups && viewGroups.length > 0 && group;
  const hasSort = sortableFields && sortableFields.length > 0;
  const searchLabel = t('collection.collectionTop.searchEntries');

  return (
    <Bar role="toolbar" aria-label={t('collection.collectionTop.sortBy')}>
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
      {hasGroup
        ? (
          <GroupControl
            viewGroups={viewGroups as NonNullable<typeof viewGroups>}
            onGroupClick={onGroupClick}
            group={group as Record<string, unknown>}
          />
        )
        : null}
      {hasFilter
        ? (
          <FilterControl
            viewFilters={viewFilters as NonNullable<typeof viewFilters>}
            onFilterClick={onFilterClick}
            filter={filter as Record<string, unknown>}
          />
        )
        : null}
      {hasSort ? <SortControl fields={sortableFields} sort={sort} onSortClick={onSortClick} /> : null}
      <Divider />
      <ViewToggleGroup>
        <LaikaIconButton
          size="sm"
          active={viewStyle === VIEW_STYLE_LIST}
          aria-label={t('collection.collectionTop.viewAsList')}
          title={t('collection.collectionTop.viewAsList')}
          onClick={() => onChangeViewStyle(VIEW_STYLE_LIST)}
        >
          <Icon type="list" />
        </LaikaIconButton>
        <LaikaIconButton
          size="sm"
          active={viewStyle === VIEW_STYLE_GRID}
          aria-label={t('collection.collectionTop.viewAsGrid')}
          title={t('collection.collectionTop.viewAsGrid')}
          onClick={() => onChangeViewStyle(VIEW_STYLE_GRID)}
        >
          <Icon type="grid" />
        </LaikaIconButton>
      </ViewToggleGroup>
    </Bar>
  );
}

export default translate()(LaikaCollectionControls);
