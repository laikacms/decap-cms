import React from 'react';

import ObjectWidgetTopBar from './ObjectWidgetTopBar';

function t(key, options = {}) {
  const dictionary = {
    'editor.editorWidgets.list.add': `Add ${options.item || 'item'}`,
    'editor.editorWidgets.object.expand': 'Expand',
    'editor.editorWidgets.object.collapse': 'Collapse',
  };
  return dictionary[key] || key;
}

function AddButtonBar() {
  return (
    <ObjectWidgetTopBar
      t={t}
      allowAdd
      label="item"
      collapsed={false}
      onAdd={() => {}}
      onCollapseToggle={() => {}}
    />
  );
}

function WithHeadingBar() {
  return <ObjectWidgetTopBar t={t} heading="Author" collapsed onCollapseToggle={() => {}} />;
}

export default {
  title: 'UI/ObjectWidgetTopBar',
  component: ObjectWidgetTopBar,
};

export const AddButton = {
  render: AddButtonBar,
};

export const WithHeading = {
  render: WithHeadingBar,
};
