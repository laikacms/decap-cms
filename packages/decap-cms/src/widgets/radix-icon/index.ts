import React from 'react';

import { IconControl } from './IconControl';
import { IconPreview } from './IconPreview';

import type { IconWidgetOptions } from './types';

function Widget(opts: IconWidgetOptions = {}) {
  return {
    name: 'radix-icon',
    controlComponent: (props: React.ComponentProps<typeof IconControl>) =>
      React.createElement(IconControl, { ...props, filter: opts.filter }),
    previewComponent: IconPreview,
  };
}

export type { IconWidgetOptions } from './types';

export const DecapCmsWidgetRadixIcon = {
  name: 'radix-icon',
  Widget,
  controlComponent: IconControl,
  previewComponent: IconPreview,
};
export default DecapCmsWidgetRadixIcon;
