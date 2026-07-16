import FieldLabel from './FieldLabel';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/FieldLabel',
  component: FieldLabel,
  args: {
    children: 'Field label',
  },
} satisfies Meta<typeof FieldLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: {
    $isActive: true,
  },
};

export const HasErrors: Story = {
  args: {
    $hasErrors: true,
  },
};
