import React from 'react';
import { translate } from 'react-polyglot';
import { Dropdown, DropdownCheckedItem } from 'decap-cms-ui-default';

import { ControlButton } from './ControlButton';

export function hasActiveFilter(filter) {
  return filter
    ?.valueSeq()
    .toJS()
    .some(f => f.active === true);
}

export function isFilterActive(filter, filterId) {
  return filter.getIn([filterId, 'active'], false);
}

function FilterControl({ viewFilters, t, onFilterClick, filter }) {
  return (
    <Dropdown
      renderButton={() => {
        return (
          <ControlButton
            active={hasActiveFilter(filter)}
            title={t('collection.collectionTop.filterBy')}
          />
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
            checked={isFilterActive(filter, viewFilter.id)}
            onClick={() => onFilterClick(viewFilter)}
          />
        );
      })}
    </Dropdown>
  );
}

export default translate()(FilterControl);
