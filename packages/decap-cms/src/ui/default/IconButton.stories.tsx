import IconButton from './IconButton';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/IconButton',
  component: IconButton,
  args: {
    type: 'settings',
    size: 'large',
    isActive: false,
    title: 'Settings',
  },
  argTypes: {
    size: { control: 'radio', options: ['small', 'large'] },
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
    type: 'close',
    title: 'Close',
  },
};

export const Active: Story = {
  args: {
    isActive: true,
  },
};
