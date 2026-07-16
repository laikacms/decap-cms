import Loader from './Loader';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Loader',
  component: Loader,
} satisfies Meta<typeof Loader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SingleMessage: Story = {
  render: () => (
    <div style={{ position: 'relative', height: '200px' }}>
      <Loader active>Loading entries…</Loader>
    </div>
  ),
};

export const RotatingMessages: Story = {
  render: () => (
    <div style={{ position: 'relative', height: '200px' }}>
      <Loader active>
        {['Loading entries…', 'This might take a few seconds', 'Almost there…']}
      </Loader>
    </div>
  ),
};
