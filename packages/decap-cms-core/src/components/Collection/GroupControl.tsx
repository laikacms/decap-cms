import React from 'react';
import { translate } from 'react-polyglot';
import { Dropdown, DropdownItem } from 'decap-cms-ui-default';
import type { Map as ImmutableMap } from 'immutable';

import type { ViewGroup } from 'decap-cms-lib-util/types/cms-immutable';
import { ControlButton } from './ControlButton';

export interface GroupControlProps {
  viewGroups: ViewGroup[];
  t: (key: string) => string;
  onGroupClick: (group: ViewGroup) => void;
  group: ImmutableMap<string, unknown>;
}

function GroupControl({ viewGroups, t, onGroupClick, group }: GroupControlProps) {
  const hasActiveGroup = group
    ?.valueSeq()
    .toJS()
    .some((f: any) => f.active === true);

  return (
    <Dropdown
      renderButton={() => {
        return (
          <ControlButton active={hasActiveGroup} title={t('collection.collectionTop.groupBy')} />
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
            isActive={group.getIn([viewGroup.id, 'active'], false) as boolean}
          />
        );
      })}
    </Dropdown>
  );
}

export default translate()(GroupControl);
