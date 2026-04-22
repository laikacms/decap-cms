import React from 'react';
import { translate } from 'react-polyglot';
import { Dropdown, DropdownCheckedItem } from 'decap-cms-ui-default';

import type { CmsViewFilter } from 'decap-cms-lib-util/types/cms';
import { ControlButton } from './ControlButton';

type ViewFilter = CmsViewFilter;

export interface FilterControlProps {
  viewFilters: ViewFilter[];
  t: (key: string) => string;
  onFilterClick: (filter: ViewFilter) => void;
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
