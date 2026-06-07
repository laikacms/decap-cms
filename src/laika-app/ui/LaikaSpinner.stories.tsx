import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import LaikaSpinner from './LaikaSpinner';

const meta: Meta<typeof LaikaSpinner> = {
  title: 'Primitives/LaikaSpinner',
  component: LaikaSpinner,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj<typeof LaikaSpinner>;

export const Default: Story = { args: { size: 'md' } };
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <LaikaSpinner size="sm" />
      <LaikaSpinner size="md" />
      <LaikaSpinner size="lg" />
    </div>
  ),
};
