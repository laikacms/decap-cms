import React from 'react';
import { translate } from 'react-polyglot';
import { Dropdown, DropdownItem } from 'decap-cms-ui-default';

import { ControlButton } from './ControlButton';

export function hasActiveGroup(group) {
  return group
    ?.valueSeq()
    .toJS()
    .some(f => f.active === true);
}

export function isGroupActive(group, groupId) {
  return group.getIn([groupId, 'active'], false);
}

function GroupControl({ viewGroups, t, onGroupClick, group }) {
  return (
    <Dropdown
      renderButton={() => {
        return (
          <ControlButton
            active={hasActiveGroup(group)}
            title={t('collection.collectionTop.groupBy')}
          />
        );
      }}
      closeOnSelection={false}
      dropdownTopOverlap="30px"
      dropdownWidth="160px"
      dropdownPosition="left"
    >
      {viewGroups.map(viewGroup => {
        return (
          <DropdownItem
            key={viewGroup.id}
            label={viewGroup.label}
            onClick={() => onGroupClick(viewGroup)}
            isActive={isGroupActive(group, viewGroup.id)}
          />
        );
      })}
    </Dropdown>
  );
}

export default translate()(GroupControl);
