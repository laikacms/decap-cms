import React, { useState } from 'react';

import LaikaSearchInput from './LaikaSearchInput';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaSearchInput> = {
  title: 'Primitives/LaikaSearchInput',
  component: LaikaSearchInput,
};
export default meta;
type Story = StoryObj<typeof LaikaSearchInput>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div style={{ width: 320 }}>
        <LaikaSearchInput
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Search collections, pages, actions…"
          aria-label="Search"
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  args: { placeholder: 'Search unavailable', disabled: true, 'aria-label': 'Disabled search' },
};
