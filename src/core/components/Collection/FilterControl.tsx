import React from 'react';
import { translate } from 'react-polyglot';

import { Dropdown, DropdownCheckedItem } from '../../../ui/default/index';
import { ControlButton } from './ControlButton';

import type { CmsViewFilter } from '../../../lib/util/index';

export interface FilterControlProps {
  viewFilters: CmsViewFilter[];
  t: (key: string) => string;
  onFilterClick: (filter: CmsViewFilter) => void;
  filter: Record<string, unknown>;
}

function FilterControl({ viewFilters, t, onFilterClick, filter }: FilterControlProps) {
  const hasActiveFilter = filter
    ? Object.values(filter).some((f: any) => f.active === true)
    : false;

  return (
    <Dropdown
      renderButton={() => {
        return (
          <ControlButton active={hasActiveFilter} title={t('collection.collectionTop.filterBy')} />
        );
      }}
      closeOnSelection={false}
      dropdownTopOverlap="30px"
      dropdownPosition="left"
    >
      {viewFilters.map(viewFilter => {
        const filterEntry = filter?.[viewFilter.id] as any;
        return (
          <DropdownCheckedItem
            key={viewFilter.id}
            label={viewFilter.label}
            id={viewFilter.id}
            checked={filterEntry?.active ?? false}
            onClick={() => onFilterClick(viewFilter)}
          />
        );
      })}
    </Dropdown>
  );
}

export default translate()(FilterControl);
