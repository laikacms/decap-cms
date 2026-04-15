import React from 'react';
import { translate } from 'react-polyglot';
import { Dropdown, DropdownItem } from 'decap-cms-ui-default';
import type { Map as ImmutableMap } from 'immutable';

import { SortDirection } from '../../types/cms';
import { ControlButton } from './ControlButton';

function nextSortDirection(direction: string | undefined) {
  switch (direction) {
    case SortDirection.Ascending:
      return SortDirection.Descending;
    case SortDirection.Descending:
      return SortDirection.None;
    default:
      return SortDirection.Ascending;
  }
}

function sortIconProps(sortDir: string) {
  return {
    icon: 'chevron' as const,
    iconDirection: sortIconDirections[sortDir] as 'up' | 'down',
    iconSmall: true,
  };
}

const sortIconDirections: Record<string, 'up' | 'down'> = {
  [SortDirection.Ascending]: 'up',
  [SortDirection.Descending]: 'down',
};

interface SortControlProps {
  t: (key: string) => string;
  fields: { key: string; label?: string }[];
  onSortClick: (key: string, direction: SortDirection) => void;
  sort: ImmutableMap<string, unknown> | undefined;
}

function SortControl({ t, fields, onSortClick, sort }: SortControlProps) {
  const hasActiveSort = sort
    ?.valueSeq()
    .toJS()
    .some((s: any) => s.direction !== SortDirection.None);

  return (
    <Dropdown
      renderButton={() => {
        return (
          <ControlButton active={hasActiveSort ?? false} title={t('collection.collectionTop.sortBy')} />
        );
      }}
      closeOnSelection={false}
      dropdownTopOverlap="30px"
      dropdownWidth="160px"
      dropdownPosition="left"
    >
      {fields.map(field => {
        const sortDir = sort?.getIn([field.key, 'direction']) as string | undefined;
        const isActive = sortDir != null && sortDir !== SortDirection.None;
        const nextSortDir = nextSortDirection(sortDir);
        return (
          <DropdownItem
            key={field.key}
            label={field.label}
            onClick={() => onSortClick(field.key, nextSortDir)}
            isActive={isActive}
            {...(isActive && sortDir ? sortIconProps(sortDir) : {})}
          />
        );
      })}
    </Dropdown>
  );
}

export default translate()(SortControl);
