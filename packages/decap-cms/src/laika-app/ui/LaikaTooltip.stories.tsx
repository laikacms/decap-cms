import React from 'react';

import LaikaButton from './LaikaButton';
import LaikaTooltip from './LaikaTooltip';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaTooltip> = {
  title: 'Primitives/LaikaTooltip',
  component: LaikaTooltip,
  argTypes: {
    placement: { control: 'select', options: ['top', 'bottom'] },
  },
};
export default meta;
type Story = StoryObj<typeof LaikaTooltip>;

export const Top: Story = {
  args: { content: 'Saves the entry', placement: 'top' },
  render: args => (
    <LaikaTooltip {...args}>
      <LaikaButton>Hover me</LaikaButton>
    </LaikaTooltip>
  ),
};

export const Bottom: Story = {
  args: { content: 'Shows below', placement: 'bottom' },
  render: args => (
    <LaikaTooltip {...args}>
      <LaikaButton>Hover me</LaikaButton>
    </LaikaTooltip>
  ),
};
