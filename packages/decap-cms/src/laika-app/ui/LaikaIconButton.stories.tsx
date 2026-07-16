import React from 'react';

import { Icon } from '@/ui/default/index';
import LaikaIconButton from './LaikaIconButton';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaIconButton> = {
  title: 'Primitives/LaikaIconButton',
  component: LaikaIconButton,
  argTypes: {
    size: { control: 'select', options: ['md', 'sm'] },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof LaikaIconButton>;

export const Default: Story = {
  args: { 'aria-label': 'Search', children: <Icon type="search" /> },
};
export const Active: Story = {
  args: { 'aria-label': 'View as grid', active: true, children: <Icon type="grid" /> },
};
export const Disabled: Story = {
  args: { 'aria-label': 'Disabled', disabled: true, children: <Icon type="settings" /> },
};
