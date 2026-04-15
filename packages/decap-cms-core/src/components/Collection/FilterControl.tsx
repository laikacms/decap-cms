import React from 'react';
import { translate } from 'react-polyglot';
import { Dropdown, DropdownCheckedItem } from 'decap-cms-ui-default';
import type { Map as ImmutableMap } from 'immutable';

import type { ViewFilter } from '../../types/cms';
import { ControlButton } from './ControlButton';

export interface FilterControlProps {
  viewFilters: ViewFilter[];
  t: (key: string) => string;
  onFilterClick: (filter: ViewFilter) => void;
  filter: ImmutableMap<string, unknown>;
}

function FilterControl({ viewFilters, t, onFilterClick, filter }: FilterControlProps) {
  const hasActiveFilter = filter
    ?.valueSeq()
    .toJS()
    .some((f: any) => f.active === true);

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
        return (
          <DropdownCheckedItem
            key={viewFilter.id}
            label={viewFilter.label}
            id={viewFilter.id}
            checked={filter.getIn([viewFilter.id, 'active'], false) as boolean}
            onClick={() => onFilterClick(viewFilter)}
          />
        );
      })}
    </Dropdown>
  );
}

export default translate()(FilterControl);
