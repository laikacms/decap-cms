import React from 'react';

import LaikaButton from './LaikaButton';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaButton> = {
  title: 'Primitives/LaikaButton',
  component: LaikaButton,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['md', 'sm'] },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof LaikaButton>;

export const Primary: Story = { args: { variant: 'primary', children: 'Save changes' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Browse' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Cancel' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Delete entry' } };
export const Small: Story = { args: { variant: 'primary', size: 'sm', children: 'Compact' } };
export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'Disabled' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <LaikaButton variant="primary">Primary</LaikaButton>
      <LaikaButton variant="secondary">Secondary</LaikaButton>
      <LaikaButton variant="ghost">Ghost</LaikaButton>
      <LaikaButton variant="danger">Danger</LaikaButton>
    </div>
  ),
};

export const AsLink: Story = {
  args: { to: '/dashboard', children: 'Open dashboard' },
};
