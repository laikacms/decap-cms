import React from 'react';

import { translate } from '@/core/i18n';
import { Dropdown, DropdownItem } from '@/ui/default/index';
import { CmsSortDirection } from '@/lib/util/index';
import { ControlButton } from './ControlButton';

function nextSortDirection(direction: string | undefined) {
  switch (direction) {
    case CmsSortDirection.Ascending:
      return CmsSortDirection.Descending;
    case CmsSortDirection.Descending:
      return CmsSortDirection.None;
    default:
      return CmsSortDirection.Ascending;
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
  [CmsSortDirection.Ascending]: 'up',
  [CmsSortDirection.Descending]: 'down',
};

interface SortControlProps {
  t: (key: string) => string;
  fields: { key: string; label?: string }[];
  onSortClick: (key: string, direction: CmsSortDirection) => void;
  sort: Record<string, unknown> | undefined;
}

function SortControl({ t, fields, onSortClick, sort }: SortControlProps) {
  const hasActiveSort = sort
    ? Object.values(sort).some((s: any) => s.direction !== CmsSortDirection.None)
    : false;

  return (
    <Dropdown
      renderButton={() => {
        return (
          <ControlButton
            active={hasActiveSort ?? false}
            title={t('collection.collectionTop.sortBy')}
          />
        );
      }}
      closeOnSelection={false}
      dropdownTopOverlap="30px"
      dropdownWidth="160px"
      dropdownPosition="left"
    >
      {fields.map(field => {
        const sortDir = sort?.[field.key]
          ? ((sort[field.key] as any)?.direction as string | undefined)
          : undefined;
        const isActive = sortDir != null && sortDir !== CmsSortDirection.None;
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
