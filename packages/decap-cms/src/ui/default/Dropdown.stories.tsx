import { useState } from 'react';

import Dropdown, { DropdownCheckedItem, DropdownItem, StyledDropdownButton } from './Dropdown';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Dropdown',
  component: Dropdown,
  // `renderButton` is required; the stories below drive rendering through their
  // own `render`, so this default only satisfies the args type.
  args: {
    renderButton: () => null,
  },
} satisfies Meta<typeof Dropdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithIcons: Story = {
  render: () => (
    <Dropdown
      renderButton={() => <StyledDropdownButton>Open menu</StyledDropdownButton>}
      dropdownWidth="180px"
    >
      <DropdownItem label="Edit" icon="write" onClick={() => {}} />
      <DropdownItem label="Preview" icon="eye" onClick={() => {}} />
      <DropdownItem label="Settings" icon="settings" onClick={() => {}} />
      <DropdownItem label="Delete" icon="close" onClick={() => {}} />
    </Dropdown>
  ),
};

function CheckboxMenu() {
  const [checked, setChecked] = useState({ drafts: true, published: false });
  return (
    <Dropdown
      renderButton={() => <StyledDropdownButton>Filter</StyledDropdownButton>}
      dropdownWidth="200px"
      closeOnSelection={false}
    >
      <DropdownCheckedItem
        id="drafts"
        label="Show drafts"
        checked={checked.drafts}
        onClick={() => setChecked(prev => ({ ...prev, drafts: !prev.drafts }))}
      />
      <DropdownCheckedItem
        id="published"
        label="Show published"
        checked={checked.published}
        onClick={() => setChecked(prev => ({ ...prev, published: !prev.published }))}
      />
    </Dropdown>
  );
}

export const WithCheckboxes: Story = {
  render: () => <CheckboxMenu />,
};
