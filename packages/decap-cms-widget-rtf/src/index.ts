import { type ComponentType, createElement } from 'react';

import controlComponent from './RichTextControl';
import previewComponent from './RichTextPreview';
import schema from './schema';

import type { FormatConverter } from './fmt/common';

interface RichTextWidgetOptions {
  textFormatters?: FormatConverter[] | undefined;
}

function Widget(opts: RichTextWidgetOptions = {}): any {
  return {
    name: 'rtf',
    controlComponent: (props: any) =>
      createElement(controlComponent as ComponentType<any>, { ...props, ...opts }),
    previewComponent: (props: any) => createElement(previewComponent, { ...props, ...opts }),
    schema,
    ...opts,
  };
}

export const DecapCmsWidgetRtf = { Widget, controlComponent, previewComponent };
export default DecapCmsWidgetRtf;
