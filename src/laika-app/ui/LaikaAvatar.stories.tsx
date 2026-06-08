import React from 'react';

import LaikaAvatar from './LaikaAvatar';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaAvatar> = {
  title: 'Primitives/LaikaAvatar',
  component: LaikaAvatar,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj<typeof LaikaAvatar>;

export const Initial: Story = { args: { name: 'Alice' } };
export const Anonymous: Story = { args: {} };
export const WithImage: Story = {
  args: { name: 'Alice', src: 'https://i.pravatar.cc/64?u=alice' },
};
export const BrokenImage: Story = {
  args: { name: 'Bob', src: 'https://example.test/missing.png' },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <LaikaAvatar size="sm" name="A" />
      <LaikaAvatar size="md" name="B" />
      <LaikaAvatar size="lg" name="C" />
    </div>
  ),
};
