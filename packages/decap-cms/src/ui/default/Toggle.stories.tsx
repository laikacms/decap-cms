import Toggle from './Toggle';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  args: {
    active: false,
  },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
  args: {
    active: true,
  },
};
