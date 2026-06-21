import React from 'react';

import Dropdown, { DropdownCheckedItem, DropdownItem, StyledDropdownButton } from './Dropdown';

function renderButton() {
  return <StyledDropdownButton>Open menu</StyledDropdownButton>;
}

function MenuWithIcons() {
  return (
    <Dropdown renderButton={renderButton} dropdownWidth="180px">
      <DropdownItem label="Edit" icon="write" onClick={() => {}} />
      <DropdownItem label="Preview" icon="eye" onClick={() => {}} />
      <DropdownItem label="Settings" icon="settings" onClick={() => {}} />
      <DropdownItem label="Delete" icon="close" onClick={() => {}} />
    </Dropdown>
  );
}

function MenuWithCheckboxes() {
  const [checked, setChecked] = React.useState({ drafts: true, published: false });

  function toggle(key) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <Dropdown renderButton={renderButton} dropdownWidth="200px" closeOnSelection={false}>
      <DropdownCheckedItem
        id="drafts"
        label="Show drafts"
        checked={checked.drafts}
        onClick={() => toggle('drafts')}
      />
      <DropdownCheckedItem
        id="published"
        label="Show published"
        checked={checked.published}
        onClick={() => toggle('published')}
      />
    </Dropdown>
  );
}

export default {
  title: 'UI/Dropdown',
  component: Dropdown,
};

export const WithIcons = {
  render: MenuWithIcons,
};

export const WithCheckboxes = {
  render: MenuWithCheckboxes,
};
