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

// Pins DCMS-2205: the top bar used to be called with `heading={false}` while
// expanded (no `types`/`allowAdd` either), producing a full-width gray strip
// whose only visible content was the chevron. The heading must render here
// too so the bar isn't an empty band.
export const ExpandedNoAddUI: Story = {
  args: {
    heading: 'Author',
    collapsed: false,
    onCollapseToggle: () => {},
  },
};
