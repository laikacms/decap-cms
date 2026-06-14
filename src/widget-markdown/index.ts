import controlComponent from './MarkdownControl';
import previewComponent from './MarkdownPreview';

function Widget(opts = {}) {
  return {
    name: 'markdown',
    controlComponent,
    previewComponent,
    ...opts,
  };
}

export const DecapCmsWidgetMarkdown = { Widget, controlComponent, previewComponent };
export default DecapCmsWidgetMarkdown;
