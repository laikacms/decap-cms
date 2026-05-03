import React from 'react';
import { translate } from 'react-polyglot';
import { Dropdown, DropdownItem } from 'decap-cms-ui-default';

import { ControlButton } from './ControlButton';

import type { CmsViewGroup } from 'decap-cms-lib-util';

export interface GroupControlProps {
  viewGroups: CmsViewGroup[];
  t: (key: string) => string;
  onGroupClick: (group: CmsViewGroup) => void;
  group: Record<string, unknown>;
}

function GroupControl({ viewGroups, t, onGroupClick, group }: GroupControlProps) {
  const hasActiveGroup = group ? Object.values(group).some((f: any) => f.active === true) : false;

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
        const groupEntry = group?.[viewGroup.id] as any;
        return (
          <DropdownItem
            key={viewGroup.id}
            label={viewGroup.label}
            onClick={() => onGroupClick(viewGroup)}
            isActive={groupEntry?.active ?? false}
          />
        );
      })}
    </Dropdown>
  );
}

export default translate()(GroupControl);
