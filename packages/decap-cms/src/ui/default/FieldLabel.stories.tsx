import { colors, colorsRaw } from './styles';
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

/**
 * DCMS-2188 regression coverage: the required "*" marker must stay visible
 * against the error-state label background instead of matching it 1:1
 * (`colors.errorText` marker on a `colors.errorText` background).
 */
export const RequiredWithErrors: Story = {
  args: {
    $hasErrors: true,
    children: (
      <>
        Field label
        <span aria-hidden="true" style={{ marginLeft: 2, color: colorsRaw.white }}>
          {' *'}
        </span>
      </>
    ),
  },
};

export const RequiredWithoutErrors: Story = {
  args: {
    $hasErrors: false,
    children: (
      <>
        Field label
        <span aria-hidden="true" style={{ marginLeft: 2, color: colors.errorText }}>
          {' *'}
        </span>
      </>
    ),
  },
};
