import React from 'react';

import ListItemTopBar from './ListItemTopBar';

function Frame({ children }) {
  return (
    <div
      style={{
        width: '320px',
        border: '1px solid #dfdfe3',
        borderRadius: '5px',
        overflow: 'hidden',
      }}
    >
      {children}
      <div style={{ padding: '16px', color: '#798291', fontSize: '14px' }}>List item content</div>
    </div>
  );
}

function CollapsibleRemovable() {
  return (
    <Frame>
      <ListItemTopBar
        collapsed={false}
        allowRemove
        onCollapseToggle={() => {}}
        onRemove={() => {}}
      />
    </Frame>
  );
}

function CollapsedItem() {
  return (
    <Frame>
      <ListItemTopBar collapsed allowRemove onCollapseToggle={() => {}} onRemove={() => {}} />
    </Frame>
  );
}

function CollapseToggleOnly() {
  return (
    <Frame>
      <ListItemTopBar collapsed={false} onCollapseToggle={() => {}} />
    </Frame>
  );
}

export default {
  title: 'UI/ListItemTopBar',
  component: ListItemTopBar,
};

export const Default = {
  render: CollapsibleRemovable,
};

export const Collapsed = {
  render: CollapsedItem,
};

export const ToggleOnly = {
  render: CollapseToggleOnly,
};
