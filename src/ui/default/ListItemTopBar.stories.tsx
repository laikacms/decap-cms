import ListItemTopBar from './ListItemTopBar';

import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';

function Frame({ children }: { children: ReactNode }) {
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

const meta = {
  title: 'UI/ListItemTopBar',
  component: ListItemTopBar,
} satisfies Meta<typeof ListItemTopBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Frame>
      <ListItemTopBar
        collapsed={false}
        allowRemove
        onCollapseToggle={() => {}}
        onRemove={() => {}}
      />
    </Frame>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <Frame>
      <ListItemTopBar collapsed allowRemove onCollapseToggle={() => {}} onRemove={() => {}} />
    </Frame>
  ),
};

export const ToggleOnly: Story = {
  render: () => (
    <Frame>
      <ListItemTopBar collapsed={false} onCollapseToggle={() => {}} />
    </Frame>
  ),
};
