import React, { useState } from 'react';

import LaikaToggleSwitch from './LaikaToggleSwitch';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaToggleSwitch> = {
  title: 'Primitives/LaikaToggleSwitch',
  component: LaikaToggleSwitch,
  argTypes: {
    size: { control: 'select', options: ['md', 'sm'] },
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof LaikaToggleSwitch>;

export const Uncontrolled: Story = {
  args: { 'aria-label': 'Sample toggle' },
};

export const Controlled: Story = {
  render: () => {
    const [on, setOn] = useState(false);
    return (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <span>Match system theme</span>
        <LaikaToggleSwitch aria-label="Match system theme" checked={on} onCheckedChange={setOn} />
        <span style={{ fontSize: 12, opacity: 0.6 }}>{on ? 'on' : 'off'}</span>
      </label>
    );
  },
};

export const Disabled: Story = {
  args: { 'aria-label': 'Disabled', disabled: true, defaultChecked: true },
};
