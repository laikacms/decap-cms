import ObjectWidgetTopBar from './ObjectWidgetTopBar';

import type { Meta, StoryObj } from '@storybook/react';
import type { TranslateFunction } from './ObjectWidgetTopBar';

const t: TranslateFunction = (key, options) => {
  const dictionary: Record<string, string> = {
    'editor.editorWidgets.list.add': `Add ${(options?.item as string) ?? 'item'}`,
    'editor.editorWidgets.object.expand': 'Expand',
    'editor.editorWidgets.object.collapse': 'Collapse',
  };
  return dictionary[key] ?? key;
};

const meta = {
  title: 'UI/ObjectWidgetTopBar',
  component: ObjectWidgetTopBar,
  args: { t },
} satisfies Meta<typeof ObjectWidgetTopBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AddButton: Story = {
  args: {
    allowAdd: true,
    label: 'item',
    collapsed: false,
    onAdd: () => {},
    onCollapseToggle: () => {},
  },
};

export const WithHeading: Story = {
  args: {
    heading: 'Author',
    collapsed: true,
    onCollapseToggle: () => {},
  },
};
